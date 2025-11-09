const Status = {
  SUCCESS: "success",
  ERROR: "error"
};

const OpenGraph = {
  OG_TAGS: [
    "og:title",
    "og:type",
    "og:url",
    "og:image",
    "og:audio",
    "og:description",
    "og:determiner",
    "og:locale",
    "og:locale:alternate",
    "og:site_name",
    "og:video",
  ]
};

/**
 * Sharing Debugger Reference: https://developers.facebook.com/tools/debug/
 */
class HTMLUtils {
  static getPageHead(htmlContent) {
    const headSplit = htmlContent.split(/<head(?:\s+[^>]*?)?>/i);
    if (!headSplit.length) {
      return "";
    }

    const pageHead = headSplit[1];

    if (!pageHead) {
      return "";
    }

    return pageHead.split("</head>")[0];
  }

  static cleanContent(content) {
    return content
      .replace(/\"/g, "")
      .replace(/\'/g, "")
      .replace(/ \//g, "")
      .replace(/\n/g, "")
      .replace(/[ \t]+$/gm, "");
  }

  static findHTMLValue({ pageHead, tagName, propertyValue, properties }) {
    const results = {};
    const tagChunks = pageHead.split(`<${tagName}`);

    for (const chunk of tagChunks) {
      for (const tag of properties) {
        const contentChunk = chunk.split(`${propertyValue}="`);

        if (chunk.includes(`${tag}"`) && contentChunk.length) {
          const tagEnd = contentChunk[1].split(">");
          let tagEndChunk = tagEnd[0];

          if (tagEndChunk[tagEndChunk.length - 1] === '/') {
            tagEndChunk = tagEndChunk.slice(0, tagEndChunk.length - 1);
          }

          const tagEndChunkValue = HTMLUtils.cleanContent(tagEndChunk);
          results[tag] = HTMLUtils.decodeEntities(tagEndChunkValue);
        }
      }
    }

    return results;
  }

  static decodeEntities(encodedString) {
    const translateRE = /&(nbsp|amp|quot|lt|gt);/g;
    const translate = {
      "nbsp": " ",
      "amp": "&",
      "quot": "\"",
      "lt": "<",
      "gt": ">"
    }

    return encodedString.replace(translateRE, (_, entity) => translate[entity])
      .replace(/&#(\d+);/gi, (_, numStr) => {
        const num = parseInt(numStr, 10);
        return String.fromCharCode(num);
      })
  }
}

export class SharingDebugger {
  getMetaTagProperties(htmlContent) {
    const pageHead = HTMLUtils.getPageHead(htmlContent);

    const metaTagProperties = HTMLUtils.findHTMLValue({
      pageHead,
      tagName: "meta", 
      propertyValue: "content", 
      properties: OpenGraph.OG_TAGS 
    });

    const canonicalURLProperties = HTMLUtils.findHTMLValue({
      pageHead,
      tagName: "link",
      propertyValue: "href",
      properties: ["canonical"],
    });

    return {
      canonicalURL: canonicalURLProperties["canonical"],
      openGraph: metaTagProperties,
    };
  }

  async debug(url) {
    let resultData = {};

    if (!url) {
      return resultData;
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      const htmlContent = await response.text();
      const openGraph = this.getMetaTagProperties(htmlContent);

      resultData = {
        status: Status.SUCCESS,
        timeScrapped: new Date().toGMTString(),
        responseCode: response.status,
        fetchedURL: url,
        host: new URL(url).host,
        ...openGraph,
      };
    } catch (error) {
      const message = `Can't scrap this site, reason: "${error.message}".`;
      resultData = {
        status: Status.ERROR,
        message,
      };
      console.log(message);
    }

    return resultData;
  }
}


