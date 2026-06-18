<?php
/*
Plugin Name: PhotoCommons
Plugin URI: https://github.com/danielyepezgarces/photocommons
Description: Search and add free images from Wikimedia Commons directly in your blog
Author: Hay Kranen, Timo Tijhof, Daniel Yepez Garces
Version: 0.4.2
Author URI: https://www.mediawiki.org/wiki/PhotoCommons
License: GPL2
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 7.4
*/

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/inc/class-photocommons.php';
new PhotoCommons( __FILE__ );
