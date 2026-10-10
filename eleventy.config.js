import fs from "node:fs";

export default function (eleventyConfig) {
  // Files copied to the site as they are
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });
  // These folders are copied as-is, not processed as pages
  eleventyConfig.ignores.add("src/admin/**");
  eleventyConfig.ignores.add("src/static/**");

  // The live address, set in Site settings ("Website address")
  eleventyConfig.addGlobalData("siteUrl", () => {
    let url = "";
    try { url = JSON.parse(fs.readFileSync("src/_data/site.json", "utf8")).url || ""; } catch (e) {}
    return (url || process.env.URL || "https://scholarfahad.com").replace(/\/$/, "");
  });
  eleventyConfig.addGlobalData("buildDate", () => new Date());

  // Posts pasted into the editor's rich-text mode get their formatting symbols
  // saved as plain text (\*\*bold\*\*, \## heading). Undo that before building.
  eleventyConfig.addPreprocessor("unescape-pasted-markdown", "md", (data, content) => {
    let out = content.replace(/\\([*#>|_\-\[\]`!+.~])/g, "$1");
    // Rich-text mode also puts blank lines between table rows, which breaks tables
    let prev;
    do { prev = out; out = out.replace(/^(\|.*\|[ \t]*)\n[ \t]*\n(?=\|)/gm, "$1\n"); } while (out !== prev);
    return out;
  });

  const levelNames = { undergraduate: "Undergraduate", masters: "Master's", phd: "PhD", highschool: "High school", other: "Other" };

  eleventyConfig.addCollection("scholarships", (api) =>
    api.getFilteredByGlob("src/scholarships/*.md").sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("guides", (api) =>
    api.getFilteredByGlob("src/guides/*.md").sort((a, b) => b.date - a.date)
  );
  // One entry per country, with its scholarships
  eleventyConfig.addCollection("countries", (api) => {
    const map = new Map();
    for (const item of api.getFilteredByGlob("src/scholarships/*.md")) {
      const c = item.data.country;
      if (!c) continue;
      if (!map.has(c)) map.set(c, []);
      map.get(c).push(item);
    }
    return [...map.entries()]
      .map(([name, items]) => ({ name, slug: slugify(name), items: items.sort((a, b) => b.date - a.date) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Opportunity types, study levels and "Open to" groups, from src/_data/taxonomy.json
  const tax = JSON.parse(fs.readFileSync("src/_data/taxonomy.json", "utf8"));
  const typeOf = (data) => data.type || "Scholarship";
  const posts = (api) => api.getFilteredByGlob("src/scholarships/*.md").sort((a, b) => b.date - a.date);

  // One page per type, level and audience, e.g. /opportunities/internships/, /scholarships/masters/
  eleventyConfig.addCollection("browsePages", (api) => {
    const all = posts(api), pages = [];
    for (const t of tax.types) pages.push({ kind: "type", key: t.value, label: t.title, title: t.title, intro: t.intro,
      url: `/opportunities/${t.slug}/`, items: all.filter((i) => typeOf(i.data) === t.value) });
    for (const l of tax.levels) pages.push({ kind: "level", key: l.value, label: l.label, title: l.title, intro: l.intro,
      url: `/scholarships/${l.slug}/`, items: all.filter((i) => (i.data.levels || []).includes(l.value)) });
    for (const a of tax.audiences) pages.push({ kind: "audience", key: a.value, label: a.label, title: a.title, intro: a.intro,
      url: `/scholarships/${a.slug}/`, items: all.filter((i) => (i.data.open_to || []).some((v) => a.includes.includes(v))) });
    return pages;
  });
  eleventyConfig.addCollection("featured", (api) => posts(api).filter((i) => i.data.featured));
  eleventyConfig.addCollection("stories", (api) =>
    api.getFilteredByGlob("src/stories/*.md").sort((a, b) => b.date - a.date)
  );

  eleventyConfig.addFilter("oppType", typeOf);
  eleventyConfig.addFilter("typeInfo", (v) => tax.types.find((t) => t.value === v) || tax.types[0]);
  eleventyConfig.addFilter("levelInfo", (v) => tax.levels.find((l) => l.value === v));
  eleventyConfig.addFilter("audienceLabel", (v) => (tax.audiences.find((a) => a.value === v) || {}).label || v);
  eleventyConfig.addFilter("browse", (pages, kind) => (pages || []).filter((p) => p.kind === kind));
  eleventyConfig.addFilter("withTypes", (items, types) => (items || []).filter((i) => types.includes(typeOf(i.data))));
  eleventyConfig.addFilter("withoutTypes", (items, types) => (items || []).filter((i) => !types.includes(typeOf(i.data))));
  // Still open and closing within N days, soonest first
  eleventyConfig.addFilter("closingSoon", (items, days) => {
    const now = Date.now();
    return (items || []).filter((i) => {
      const d = new Date(i.data.deadline);
      if (!i.data.deadline || isNaN(d)) return false;
      const left = (d - now) / 86400000;
      return left >= -1 && left <= days;
    }).sort((a, b) => new Date(a.data.deadline) - new Date(b.data.deadline));
  });
  // Not yet closed (posts without a deadline count as open)
  eleventyConfig.addFilter("stillOpen", (items) => (items || []).filter((i) => {
    const d = new Date(i.data.deadline);
    return !i.data.deadline || isNaN(d) || d >= new Date(Date.now() - 86400000);
  }));
  eleventyConfig.addFilter("closedOnly", (items) => (items || []).filter((i) => {
    const d = new Date(i.data.deadline);
    return i.data.deadline && !isNaN(d) && d < new Date(Date.now() - 86400000);
  }));
  // Pieces of a date for calendar-style badges
  eleventyConfig.addFilter("dayNum", (d) => new Date(d).getUTCDate());
  eleventyConfig.addFilter("monShort", (d) => new Date(d).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }));
  eleventyConfig.addFilter("daysLeft", (d) => Math.max(0, Math.ceil((new Date(d) - new Date()) / 86400000)));
  eleventyConfig.addFilter("topCountries", (countries, n) =>
    [...(countries || [])].filter((c) => !/worldwide|online/i.test(c.name)).sort((a, b) => b.items.length - a.items.length).slice(0, n)
  );

  eleventyConfig.addFilter("levelName", (l) => levelNames[l] || l);
  eleventyConfig.addFilter("slug2", slugify);
  eleventyConfig.addFilter("readableDate", (d) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
  );
  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter("year", (d) => new Date(d).getUTCFullYear());
  eleventyConfig.addFilter("limit", (arr, n) => (arr || []).slice(0, n));
  eleventyConfig.addFilter("displayUrl", (u) => String(u || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""));
  eleventyConfig.addFilter("excludeUrl", (arr, url) => (arr || []).filter((i) => i.url !== url));
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));
  eleventyConfig.addFilter("striptags", (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
  // Deadline status for listings
  eleventyConfig.addFilter("deadlineStatus", (deadline) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    if (isNaN(d)) return null;
    const days = Math.ceil((d - new Date()) / 86400000);
    if (days < 0) return { label: "Closed", cls: "closed" };
    if (days <= 14) return { label: `Closes in ${days} day${days === 1 ? "" : "s"}`, cls: "soon" };
    return { label: "Open", cls: "open" };
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}

function slugify(s) {
  return String(s)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
