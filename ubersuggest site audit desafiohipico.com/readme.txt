
  Difficulty:
Hard - Requires high technical knowledge to fix.
Moderate - Requires some technical knowledge to fix.
Easy - Requires little technical knowledge to fix.
  SEO Impact:
High - Critical issues that must be fixed. They have the greatest effect on traffic and rankings.
Medium - Issues that affect traffic and rankings, but are not putting a website in critical SEO danger.
Low - Recommended fixes based on best practices. They have the least effect on traffic and rankings.
1. Problem: Without a H1 heading
Report file: no_h1_heading.csv
Description: Search engine crawlers prefer content that is structured properly and has a hierarchy when it comes to heading tags. The H1 tag is the most important and tells search engines what it is your content is about. There should only be one H1 tag for each page.
Solution: Add an H1 tag to your pages that is relevant to the content you are posting. Try to include keywords in your H1 tag and limit each page to just one H1 tag.
Difficulty: Easy
SEO Impact: Medium
Columns:
    1. URL
    2. H1 count
2. Problem: Have a low word count
Report file: low_word_count.csv
Description: Without enough text on a page, Google will have trouble understanding what the content is about. 

If Google doesn't know what the content is about, it won't be able to rank your content for the search terms you are targeting. 

By adding more text, you are telling Google's crawlers, and your end users, more about what it is you have to offer. Anything less than a few hundred words is considered thin content and will be nearly impossible to rank.
Solution: Add more content to your page so that it isn't considered thin content and has a better chance of ranking. In general the average web page that ranks on page 1 of Google contains 2200 words.
Difficulty: Moderate
SEO Impact: High
Columns:
    1. URL
    2. Content count words
3. Problem: Blocked from appearing in search engines
Report file: page_blocked_from_crawling.csv
Description: Sometimes there are pages on your site that you don't want appearing in search results. The robots.txt file, Robots Meta Tag and X-Robots-Tag in the HTTP header are methods that you can use to tell search engines that you don’t want a specific URL shown in search results. It's extremely important that you know which pages you want search engines to discover and which ones you don’t. By blocking your pages via one of the methods above, you are telling search engine crawlers that you don’t want people to find your content.
Solution: Ensure that all of the pages on your site that you want to be indexed by search engines are not being accidentally blocked. If you find any pages that are blocked unintentionally, remove the existing Robots Meta Tag, X-Robots-Tag or robots.txt file directive that is currently in place.
Difficulty: Moderate
SEO Impact: High
Columns:
    1. URL
    2. Page block reason
4. Problem: With a <title> tag that is too long
Report file: title_tag_too_long.csv
Description: It is recommended to keep your title tag under 65 characters so you don't run the risk of having part of it cut out from the search results page.

To learn more about creating SEO-friendly title tags, check out {0} article.
Solution: Go through your pages and shorten any of your title tags that exceed 65 characters.
Difficulty: Easy
SEO Impact: Medium
Columns:
    1. URL
    2. Title long
5. Problem: With a poorly formatted URL for SEO
Report file: seo_non_friendly_url.csv
Description: In order to create a URL that is truly SEO-friendly, one must take into account certain factors that Google deems important for rankings. Some of these factors include the length of the URL not exceeding 120 characters, how relevant the wording in the title is to the content in the post, avoiding symbols and underscores within the slug, inclusion of session IDs, too many different sub-folders, and so on.

To learn more about SEO-friendly URLs, check out {0} article.
Solution: Avoid overcomplicating your URL structure by only focusing on using keywords in your slug that are relevant to the content in the post. Your URL should only contain numbers, letters, and dashes, and you should avoid using extraneous characters such as: !, @, #, $, %, ^, &, *, (, ), [, ], ?, {, }, ;, :, “.
Difficulty: Easy
SEO Impact: Medium
Columns:
    1. URL
    2. Seo friendly url
6. Problem: Keywords check
Report file: seo_friendly_url_keywords_check.csv
Description: <b>Keywords Check</b> - This test will be looking for the consistency of page URL with meta tag keywords. If the keywords tag is empty or absent then the URL is being compared with the content of &lt;title&gt; tag.
Difficulty: Easy
SEO Impact: Medium
Columns:
    1. URL
    2. Seo friendly url keywords check
