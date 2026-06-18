<?php
/*
	Copyright 2011
	@author Husky <huskyr@gmail.com>
	@author Krinkle <krinklemail@gmail.com>
	@author Daniel Yepez Garces

	This program is free software; you can redistribute it and/or modify
	it under the terms of the GNU General Public License, version 2, as
	published by the Free Software Foundation.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program; if not, write to the Free Software
	Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PhotoCommons {
	const FILEPATH_PATTERN = 'https://commons.wikimedia.org/w/index.php?title=Special:FilePath&file=%s&width=%s';
	const FILEPAGE_PATTERN = 'https://commons.wikimedia.org/w/index.php?title=File:%s';
	const FEATURED_META_KEY = '_photocommons_featured_file';
	const VERSION = '0.4.1';

	/**
	 * Absolute path to the main plugin file.
	 *
	 * @var string
	 */
	private $pluginFile;

	/**
	 * @param string $plugin_file Absolute path to the main plugin file.
	 */
	public function __construct( $plugin_file ) {
		$this->pluginFile = $plugin_file;

		add_action( 'init', array( $this, 'register_block' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		add_action( 'save_post', array( $this, 'maybe_set_featured_image' ), 20, 2 );
		add_shortcode( 'photocommons', array( $this, 'add_shortcode' ) );

		if ( is_admin() ) {
			$this->init_admin();
		}
	}

	public function register_block() {
		register_post_meta(
			'',
			self::FEATURED_META_KEY,
			array(
				'type' => 'string',
				'single' => true,
				'default' => '',
				'sanitize_callback' => 'sanitize_text_field',
				'show_in_rest' => true,
				'auth_callback' => function() {
					return current_user_can( 'edit_posts' );
				},
			)
		);

		wp_register_script(
			'photocommons-block',
			plugins_url( 'js/block.js', $this->pluginFile ),
			array( 'wp-api-fetch', 'wp-blocks', 'wp-block-editor', 'wp-components', 'wp-data', 'wp-element', 'wp-i18n' ),
			self::VERSION,
			true
		);

		wp_localize_script(
			'photocommons-block',
			'WP_PHOTOCOMMONS_BLOCK',
			array(
				'featuredMetaKey' => self::FEATURED_META_KEY,
			)
		);

		register_block_type(
			'photocommons/image',
			array(
				'api_version' => 2,
				'editor_script' => 'photocommons-block',
				'render_callback' => array( $this, 'render_block' ),
				'attributes' => array(
					'file' => array(
						'type' => 'string',
						'default' => '',
					),
					'width' => array(
						'type' => 'number',
						'default' => 300,
					),
					'align' => array(
						'type' => 'string',
						'default' => 'right',
					),
					'useAsFeatured' => array(
						'type' => 'boolean',
						'default' => false,
					),
				),
			)
		);

	}

	public function register_rest_routes() {
		register_rest_route(
			'photocommons/v1',
			'/search',
			array(
				'methods' => WP_REST_Server::READABLE,
				'callback' => array( $this, 'rest_search' ),
				'permission_callback' => function() {
					return current_user_can( 'edit_posts' );
				},
				'args' => array(
					'term' => array(
						'required' => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
					'page' => array(
						'default' => 1,
						'sanitize_callback' => 'absint',
					),
					'per_page' => array(
						'default' => 20,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
	}

	public function add_shortcode( $args ) {
		$args = shortcode_atts(
			array(
				'file' => '',
				'width' => 300,
				'align' => 'right',
			),
			(array) $args,
			'photocommons'
		);

		$filename = is_scalar( $args['file'] ) ? sanitize_text_field( wp_unslash( $args['file'] ) ) : '';
		if ( '' === $filename ) {
			return '';
		}

		$width = is_scalar( $args['width'] ) ? absint( $args['width'] ) : 300;
		$width = max( 1, min( 2560, $width ) );
		$align = $this->get_alignment_class( is_scalar( $args['align'] ) ? $args['align'] : 'right' );
		$thumb = $this->get_thumb_url( $filename, $width );
		$filepage = $this->get_page_url( $filename );

		return sprintf(
			'<a href="%s" title="%s" class="wp-photocommons-thumb">' .
			'<img src="%s" title="%s via Wikimedia Commons" alt="%s" class="%s" width="%s" />' .
			'</a>',
			esc_url( $filepage ),
			esc_attr( $filename ),
			esc_url( $thumb ),
			esc_attr( $filename ),
			esc_attr( $filename ),
			esc_attr( $align ),
			esc_attr( (string) $width )
		);
	}

	public function render_block( $attributes ) {
		if ( ! empty( $attributes['useAsFeatured'] ) ) {
			return '';
		}

		return $this->add_shortcode( $attributes );
	}

	public function rest_search( WP_REST_Request $request ) {
		$term = $request->get_param( 'term' );
		$page = max( 1, absint( $request->get_param( 'page' ) ) );
		$per_page = max( 1, min( 40, absint( $request->get_param( 'per_page' ) ) ) );

		if ( '' === $term ) {
			return rest_ensure_response(
				array(
					'results' => array(),
					'page' => $page,
					'hasMore' => false,
				)
			);
		}

		$response = wp_remote_get(
			add_query_arg(
				array(
					'action' => 'query',
					'format' => 'json',
					'generator' => 'search',
					'gsrsearch' => $term,
					'gsrnamespace' => 6,
					'gsrlimit' => $per_page,
					'gsroffset' => ( $page - 1 ) * $per_page,
					'prop' => 'imageinfo',
					'iiprop' => 'url',
					'iiurlwidth' => 180,
				),
				'https://commons.wikimedia.org/w/api.php'
			),
			array(
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'photocommons_search_failed', __( 'Could not search Wikimedia Commons.', 'photocommons' ), array( 'status' => 502 ) );
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		$pages = isset( $data['query']['pages'] ) && is_array( $data['query']['pages'] ) ? $data['query']['pages'] : array();
		$results = array();

		foreach ( $pages as $page_data ) {
			if ( empty( $page_data['title'] ) || empty( $page_data['imageinfo'][0]['thumburl'] ) ) {
				continue;
			}

			$filename = preg_replace( '/^File:/', '', $page_data['title'] );
			$results[] = array(
				'id' => absint( $page_data['pageid'] ),
				'title' => sanitize_text_field( $page_data['title'] ),
				'filename' => sanitize_text_field( $filename ),
				'thumbUrl' => esc_url_raw( $page_data['imageinfo'][0]['thumburl'] ),
				'url' => empty( $page_data['imageinfo'][0]['url'] ) ? '' : esc_url_raw( $page_data['imageinfo'][0]['url'] ),
			);
		}

		return rest_ensure_response(
			array(
				'results' => $results,
				'page' => $page,
				'hasMore' => ! empty( $data['continue']['gsroffset'] ),
			)
		);
	}

	public function maybe_set_featured_image( $post_id, $post ) {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}

		if ( isset( $_POST['photocommons_featured_nonce'], $_POST[ self::FEATURED_META_KEY ] ) && is_scalar( $_POST['photocommons_featured_nonce'] ) && is_scalar( $_POST[ self::FEATURED_META_KEY ] ) && wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['photocommons_featured_nonce'] ) ), 'photocommons_featured' ) && current_user_can( 'edit_post', $post_id ) ) {
			update_post_meta( $post_id, self::FEATURED_META_KEY, sanitize_text_field( wp_unslash( $_POST[ self::FEATURED_META_KEY ] ) ) );
		}

		if ( ! $post || ! post_type_supports( $post->post_type, 'thumbnail' ) || has_post_thumbnail( $post_id ) ) {
			return;
		}

		$filename = get_post_meta( $post_id, self::FEATURED_META_KEY, true );
		$filename = is_scalar( $filename ) ? sanitize_text_field( $filename ) : '';

		if ( '' === $filename ) {
			return;
		}

		$attachment_id = $this->get_or_create_attachment( $filename, $post_id );
		if ( $attachment_id ) {
			set_post_thumbnail( $post_id, $attachment_id );
		}
	}

	private function get_thumb_url( $file, $width ) {
		return sprintf( self::FILEPATH_PATTERN, rawurlencode( $file ), rawurlencode( $width ) );
	}

	private function get_page_url( $file ) {
		return sprintf( self::FILEPAGE_PATTERN, rawurlencode( $file ) );
	}

	private function get_or_create_attachment( $filename, $post_id ) {
		$existing = $this->find_attachment_by_commons_file( $filename );
		if ( $existing ) {
			return $existing;
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$tmp = download_url( $this->get_thumb_url( $filename, 1600 ) );
		if ( is_wp_error( $tmp ) ) {
			return 0;
		}

		$file_array = array(
			'name' => wp_basename( $filename ),
			'tmp_name' => $tmp,
		);
		$attachment_id = media_handle_sideload( $file_array, $post_id, $filename );
		if ( is_wp_error( $attachment_id ) ) {
			@unlink( $tmp );
			return 0;
		}

		update_post_meta( $attachment_id, '_photocommons_source_file', $filename );
		update_post_meta( $attachment_id, '_photocommons_source_page', $this->get_page_url( $filename ) );

		return absint( $attachment_id );
	}

	private function find_attachment_by_commons_file( $filename ) {
		$attachments = get_posts(
			array(
				'post_type' => 'attachment',
				'post_status' => 'inherit',
				'posts_per_page' => 1,
				'fields' => 'ids',
				'meta_key' => '_photocommons_source_file',
				'meta_value' => $filename,
			)
		);

		return empty( $attachments ) ? 0 : absint( $attachments[0] );
	}

	private function init_admin() {
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );
		add_action( 'media_buttons', array( $this, 'render_media_button' ), 20 );
	}

	public function enqueue_admin_assets( $hook_suffix ) {
		if ( ! $this->is_editor_screen( $hook_suffix ) ) {
			return;
		}

		wp_enqueue_media();
		$this->enqueue_scripts();
		$this->enqueue_styles();
	}

	public function render_media_button() {
		printf(
			'<button type="button" id="photocommons-add" class="button"><img src="%s" alt="" />%s</button><input type="hidden" name="%s" id="photocommons-featured-file" value="" /><input type="hidden" name="photocommons_featured_nonce" value="%s" />',
			esc_url( plugins_url( 'img/button.png', $this->pluginFile ) ),
			esc_html__( 'Add Wikimedia Commons image', 'photocommons' ),
			esc_attr( self::FEATURED_META_KEY ),
			esc_attr( wp_create_nonce( 'photocommons_featured' ) )
		);
	}

	private function enqueue_scripts() {
		wp_register_script(
			'photocommons-suggestions',
			plugins_url( 'js/photocommons-suggestions.js', $this->pluginFile ),
			array( 'jquery' ),
			self::VERSION,
			true
		);
		wp_register_script(
			'photocommons-search',
			plugins_url( 'js/search.js', $this->pluginFile ),
			array( 'jquery', 'photocommons-suggestions' ),
			self::VERSION,
			true
		);
		wp_register_script(
			'photocommons-admin',
			plugins_url( 'js/admin.js', $this->pluginFile ),
			array( 'jquery', 'jquery-ui-dialog', 'photocommons-search' ),
			self::VERSION,
			true
		);

		wp_localize_script(
			'photocommons-admin',
			'WP_PHOTOCOMMONS',
			array(
				'imgLoaderUrl' => plugins_url( 'img/loading.gif', $this->pluginFile ),
				'translations' => array(
					'Insert images from Wikimedia Commons' => __( 'Insert images from Wikimedia Commons', 'photocommons' ),
					'PhotoCommons' => __( 'PhotoCommons', 'photocommons' ),
					'Search' => __( 'Search', 'photocommons' ),
					'No images found.' => __( 'No images found.', 'photocommons' ),
					'Use as featured image instead of inserting in post content' => __( 'Use as featured image instead of inserting in post content', 'photocommons' ),
				),
			)
		);

		wp_enqueue_script( 'photocommons-suggestions' );
		wp_enqueue_script( 'photocommons-search' );
		wp_enqueue_script( 'photocommons-admin' );
	}

	private function enqueue_styles() {
		wp_enqueue_style( 'wp-jquery-ui-dialog' );

		wp_register_style(
			'photocommons-suggestions',
			plugins_url( 'css/photocommons-suggestions.css', $this->pluginFile ),
			array(),
			self::VERSION
		);
		wp_register_style(
			'photocommons-search',
			plugins_url( 'css/search.css', $this->pluginFile ),
			array( 'wp-jquery-ui-dialog', 'photocommons-suggestions' ),
			self::VERSION
		);

		wp_enqueue_style( 'photocommons-suggestions' );
		wp_enqueue_style( 'photocommons-search' );
	}

	private function get_alignment_class( $align ) {
		$align = strtolower( sanitize_key( $align ) );
		$allowed = array( 'left', 'center', 'right', 'none' );

		if ( ! in_array( $align, $allowed, true ) ) {
			$align = 'right';
		}

		return 'none' === $align ? 'alignnone' : 'align' . $align;
	}

	private function is_editor_screen( $hook_suffix ) {
		return in_array( $hook_suffix, array( 'post.php', 'post-new.php' ), true );
	}
}
