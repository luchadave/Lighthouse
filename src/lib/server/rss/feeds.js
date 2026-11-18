// @ts-nocheck
import { XMLParser, XMLValidator, XMLBuilder } from 'fast-xml-parser';
import sanitize from 'sanitize-html';
import { decodeHTML } from 'entities';
import { db, cleanup, storeArticles, INTERVAL } from './db.js';
import { fetchFeed, webURL } from './network.js';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', processEntities: true, isArray: name => ['item','entry','outline','link'].includes(name) });
const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const contentText = v => v && typeof v === 'object' && !('#text' in v) ? builder.build(v) : text(v);
const list = v => v ? (Array.isArray(v) ? v : [v]) : [];
const text = v => typeof v === 'object' ? String(v?.['#text'] ?? '') : String(v ?? '');
export function cleanContent(html, base) {
  return sanitize(html, { allowedTags: ['p','br','hr','h1','h2','h3','h4','h5','h6','a','strong','b','em','i','u','s','del','blockquote','pre','code','ul','ol','li','img','figure','figcaption','table','thead','tbody','tr','th','td','span','div'], allowedAttributes: { a: ['href','title','rel','target'], img: ['src','alt','title','loading','referrerpolicy'], td: ['colspan'], th: ['colspan'] }, allowedSchemes: ['http','https','mailto'], allowProtocolRelative: false, transformTags: {
    a: (tag, attrs) => { let href; try { href = webURL(attrs.href, base); } catch {} return { tagName: 'a', attribs: { ...(href ? { href } : {}), target: '_blank', rel: 'noopener noreferrer' } }; },
    img: (tag, attrs) => { let src; try { src = webURL(attrs.src, base); } catch {} return { tagName: 'img', attribs: { ...(src ? { src } : {}), alt: attrs.alt || '', loading: 'lazy', referrerpolicy: 'no-referrer' } }; }
  } });
}
function parseXML(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML entity declarations are not supported');
  if (XMLValidator.validate(xml) !== true) throw new Error('This file is not valid XML');
  return parser.parse(xml);
}
export function parseFeed(xml, base) {
  const root = parseXML(xml); const channel = root.rss?.channel || root.feed || root['rdf:RDF']?.channel;
  if (!channel) throw new Error('This URL is not an RSS or Atom feed');
  const title = decodeHTML(sanitize(text(channel.title), { allowedTags: [], allowedAttributes: {} })).slice(0,500) || new URL(base).hostname;
  const items = list(channel.item || channel.entry || root['rdf:RDF']?.item).slice(0,500).flatMap(item => {
    const atomLink = list(item.link).find(l => typeof l === 'object' && (!l['@_rel'] || l['@_rel'] === 'alternate'));
    const link = atomLink?.['@_href'] || text(list(item.link)[0]);
    let url; try { url = webURL(link, base); } catch { return []; }
    if (!link) return [];
    const identity = text(item.guid || item.id) || url;
    const raw = contentText(item['content:encoded'] || item.content || item.description || item.summary);
    const date = Date.parse(text(item.pubDate || item.published || item.updated || item['dc:date']));
    return [{ identity: identity.slice(0,2048), url, title: decodeHTML(sanitize(text(item.title), { allowedTags: [], allowedAttributes: {} })).slice(0,1000) || 'Untitled article', content: cleanContent(raw, url), published: Number.isFinite(date) ? date : null }];
  });
  return { title, items };
}
export function parseOPML(xml) {
  const root = parseXML(xml); if (!root.opml?.body) throw new Error('Choose a valid OPML subscription file');
  const result = []; const walk = (nodes, depth = 0) => { if (depth > 20) throw new Error('OPML nesting is too deep'); for (const node of list(nodes)) { if (node['@_xmlUrl']) result.push({ url: webURL(node['@_xmlUrl']), title: text(node['@_title'] || node['@_text'] || node['@_xmlUrl']) }); if (node.outline) walk(node.outline, depth + 1); } };
  walk(root.opml.body.outline);
  const unique = [...new Map(result.map(item => [item.url, item])).values()];
  if (unique.length > 100) throw new Error('Import up to 100 feeds at a time');
  return unique;
}
const pending = new Map();
export function refreshFeed(feed) {
  if (pending.has(feed.id)) return pending.get(feed.id);
  const task = (async () => {
    try {
      const response = await fetchFeed(feed.url, { ...(feed.etag ? { 'If-None-Match': feed.etag } : {}), ...(feed.modified ? { 'If-Modified-Since': feed.modified } : {}) });
      if (!db.prepare('SELECT id FROM feeds WHERE id=?').get(feed.id)) return;
      if (response.status === 200) {
        const parsed = parseFeed(response.text, response.url);
        storeArticles({ ...feed, title: parsed.title }, parsed.items);
        db.prepare('UPDATE feeds SET title=?,etag=?,modified=? WHERE id=?').run(parsed.title,response.etag,response.modified,feed.id);
      }
      db.prepare('UPDATE feeds SET fetched_at=?,error=NULL WHERE id=?').run(Date.now(),feed.id);
    } catch (error) {
      db.prepare('UPDATE feeds SET fetched_at=?,error=? WHERE id=?').run(Date.now(),String(error.message).slice(0,300),feed.id);
    } finally { pending.delete(feed.id); }
  })(); pending.set(feed.id,task); return task;
}
let running = false;
export async function tick() {
  if (running) return; running = true;
  try {
    cleanup();
    const feeds = db.prepare('SELECT * FROM feeds WHERE fetched_at < ? ORDER BY fetched_at').all(Date.now() - INTERVAL);
    for (let i = 0; i < feeds.length; i += 3) await Promise.all(feeds.slice(i,i+3).map(refreshFeed));
  } finally { running = false; }
}
let timer;
export function startScheduler() {
  if (timer) return;
  tick().catch(console.error);
  timer = setInterval(() => tick().catch(console.error), 60000); timer.unref();
}
