export default function (eleventyConfig) {
  // Files copied to the site as they are
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });
  // These folders are copied as-is, not processed as pages
  eleventyConfig.ignores.add("src/admin/**");
  eleventyConfig.ignores.add("src/static/**");

  // The live address: Netlify provides it during builds (custom domain once connected)
  eleventyConfig.addGlobalData("siteUrl", () =>
    (process.env.URL || "https://scholarfahad.com").replace(/\/$/, "")
  );
  eleventyConfig.addGlobalData("buildDate", () => new Date());

  const levelNames = { undergraduate: "Undergraduate", masters: "Master's", phd: "PhD", other: "Other" };

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
