(function($) {

	/**
	 * Escape a string for HTML.
	 *
	 * Converts special characters to HTML entities.
	 *
	 * @param {string} text The string to escape
	 * @return {string} HTML
	 */
	function escHtml(text) {
		return text.replace( /['"<>&]/g, function ( s ) {
			switch ( s ) {
			case '\'':
				return '&#039;';
			case '"':
				return '&quot;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '&':
				return '&amp;';
			}
		} );
	}

	/**
	 * @param {string} key
	 * @return {string} Message text
	 */
	function msg(key) {
		var raw = PHOTOCOMMONS.translations[key];
		if (!raw) {
			throw new Error('Unknown message key: ' + key);
		}
		return raw;
	}

	function msgEsc(key) {
		return escHtml(msg(key));
	}

	function addButtons() {
		var $dialog = $('<div id="photocommons-dialog"></div>')
			.html(''.concat(
				'<label for="wp-photocommons-search">',
				msgEsc('Search'),
				':</label>',
				'<input type="search" id="wp-photocommons-search" />',
				'<ul id="wp-photocommons-results"></ul>',
				'<p><label><input type="checkbox" id="wp-photocommons-featured" /> ',
				msgEsc('Use as featured image instead of inserting in post content'),
				'</label></p>',
				'<img src="' + escHtml(PHOTOCOMMONS.imgLoaderUrl) + '" style="display:none;" id="wp-photocommons-loading" alt="" />',
				'<div id="wp-photocommons-images"></div>'
			))
			.appendTo('body');

		PhotoCommons.init();

		$dialog.dialog({
			title: msg('PhotoCommons') + ' - ' + msg('Insert images from Wikimedia Commons'),
			width: 800,
			height: 500,
			autoOpen: false
		});

		$('#photocommons-add').on('click', function(e) {
			e.preventDefault();

			$dialog.dialog('open');
		});

		$('#wp-photocommons-images').on('click', '.image', function() {
			var file = $(this).attr('data-filename'),
				shortcode = '[photocommons file="' + file + '" width="300"] ';

			if ($('#wp-photocommons-featured').prop('checked')) {
				$('#photocommons-featured-file').val(file);
				$dialog.dialog('close');
				return;
			}

			if (window.wp && wp.media && wp.media.editor) {
				wp.media.editor.insert(shortcode);
			} else if (window.tinyMCE && tinyMCE.activeEditor && !tinyMCE.activeEditor.isHidden()) {
				tinyMCE.execCommand('mceInsertContent', false, shortcode);
			} else {
				$('#content').val(function(i, val) {
					return shortcode + val;
				});
			}

			$dialog.dialog('close');
		});

	}

	$( addButtons );

})(jQuery);
