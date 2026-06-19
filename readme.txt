=== PhotoCommons ===

Contributors: huskyr, timotijhof, dyepezg
Donate link: https://donate.wikimedia.org
Tags: photos, media, embed, wikimedia, wikipedia
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.4.6
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Search, Find and Insert images directly from Wikimedia Commons into your WordPress site.

Note: This is an unofficial plugin developed by independent open-source volunteers and is not affiliated with, endorsed, or sponsored by the Wikimedia Foundation.


== Installation ==

1. Upload the `photocommons` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin through the Plugins menu in WordPress.
3. In the block editor, add the "PhotoCommons" block from the Media category.
4. Click "Select image" to open the Wikimedia Commons picker.
5. Search, page through results, and select an image, or enter the file name manually, for example `Example.jpg`.
6. To use the Commons image as the featured image instead of inserting it in the post, enable the checkbox in the block settings and save the post.

You can also use the shortcode directly:

[photocommons file="Example.jpg" width="300" align="right"]

== External Services ==

This plugin relies on external services to search, embed, and download free images. Specifically, it connects to Wikimedia Commons:
* Service: Wikimedia Commons API and FilePath service.
* Purpose: Used to search for public domain and creative commons images, retrieve metadata, and download the selected images to the WordPress media library.
* Data sent: The search terms, requested page index, and the file names of the selected images. No personal or user identifying data is sent, though the user's IP address (for search requests made in the browser) or the web server's IP address (for image downloads) will be exposed to Wikimedia Foundation servers as part of standard web requests.
* Terms of Use: https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use
* Privacy Policy: https://foundation.wikimedia.org/wiki/Policy:Privacy_policy
* Image Re-use & Licensing: Images retrieved from Wikimedia Commons are subject to the licensing terms chosen by their respective authors (typically Creative Commons or Public Domain). Users of this plugin must adhere to each image's license requirements (such as proper attribution). Learn more in the Wikimedia Commons Re-use Guide: https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia


