=== PhotoCommons ===
* Contributors: huskyr, timotijhof, dyepezg
* Donate link: https://donate.wikimedia.org
* Tags: photos, media, insert, embed, wikimedia, wikipedia
* Requires at least: 6.0
* Tested up to: 6.9
* Requires PHP: 7.4
* Stable tag: trunk

Search, Find and Insert images directly from Wikimedia Commons into your WordPress site.

== Installation ==

1. Upload the `photocommons` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin through the Plugins menu in WordPress.
3. In the block editor, add the "PhotoCommons" block from the Media category.
4. Click "Select image" to open the Wikimedia Commons picker.
5. Search, page through results, and select an image, or enter the file name manually, for example `Example.jpg`.
6. To use the Commons image as the featured image instead of inserting it in the post, enable the checkbox in the block settings and save the post.

You can also use the shortcode directly:

`
[photocommons file="Example.jpg" width="300" align="right"]
`
