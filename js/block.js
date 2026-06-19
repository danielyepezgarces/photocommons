(function(blocks, blockEditor, components, data, element, i18n, apiFetch) {
	var el = element.createElement;
	var __ = i18n.__;
	var sprintf = i18n.sprintf;
	var BlockControls = blockEditor.BlockControls;
	var AlignmentToolbar = blockEditor.BlockAlignmentToolbar || blockEditor.AlignmentToolbar;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var Button = components.Button;
	var CheckboxControl = components.CheckboxControl;
	var Flex = components.Flex;
	var Modal = components.Modal;
	var PanelBody = components.PanelBody;
	var Placeholder = components.Placeholder;
	var Popover = components.Popover;
	var RangeControl = components.RangeControl;
	var SelectControl = components.SelectControl;
	var Spinner = components.Spinner;
	var TextControl = components.TextControl;
	var ToolbarButton = components.ToolbarButton;
	var ToolbarGroup = components.ToolbarGroup;

	function getThumbUrl(file, width) {
		return 'https://commons.wikimedia.org/w/index.php?title=Special:FilePath&file=' +
			encodeURIComponent(file) + '&width=' + encodeURIComponent(width || 300);
	}

	function getAlignmentClass(align) {
		return align === 'none' ? 'alignnone' : 'align' + align;
	}

	function searchPath(term, page) {
		return '/photocommons/v1/search?term=' + encodeURIComponent(term) + '&page=' + page + '&per_page=20';
	}

	function getFigureStyle(align) {
		var style = {
			display: 'table',
			marginBottom: 0,
			marginTop: 0,
			position: 'relative'
		};

		if (align === 'center') {
			style.marginLeft = 'auto';
			style.marginRight = 'auto';
		} else if (align === 'right') {
			style.marginLeft = 'auto';
			style.marginRight = 0;
		} else {
			style.marginLeft = 0;
			style.marginRight = 0;
		}

		return style;
	}

	function updateFeaturedMeta(file) {
		var editor = data.dispatch('core/editor');
		var metaKey = PHOTOCOMMONS_BLOCK.featuredMetaKey;
		var meta = {};

		meta[metaKey] = file || '';
		editor.editPost({ meta: meta });
	}

	blocks.registerBlockType('photocommons/image', {
		title: __('PhotoCommons', 'photocommons'),
		description: __('Insert an image from Wikimedia Commons.', 'photocommons'),
		category: 'media',
		icon: 'format-image',
		keywords: [
			__('Wikimedia', 'photocommons'),
			__('Commons', 'photocommons'),
			__('image', 'photocommons')
		],
		attributes: {
			file: {
				type: 'string',
				default: ''
			},
			width: {
				type: 'number',
				default: 300
			},
			align: {
				type: 'string',
				default: 'right'
			},
			useAsFeatured: {
				type: 'boolean',
				default: false
			},
			author: {
				type: 'string',
				default: ''
			},
			license: {
				type: 'string',
				default: ''
			},
			licenseUrl: {
				type: 'string',
				default: ''
			}
		},
		edit: function(props) {
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;
			var isSelected = props.isSelected;
			var clientId = props.clientId;
			var blockProps = useBlockProps();
			var modalState = element.useState(false);
			var isModalOpen = modalState[0];
			var setIsModalOpen = modalState[1];
			var manualPopoverState = element.useState(false);
			var isManualPopoverOpen = manualPopoverState[0];
			var setIsManualPopoverOpen = manualPopoverState[1];
			var searchState = element.useState('');
			var searchTerm = searchState[0];
			var setSearchTerm = searchState[1];
			var manualState = element.useState('');
			var manualFile = manualState[0];
			var setManualFile = manualState[1];
			var submittedTermState = element.useState('');
			var submittedTerm = submittedTermState[0];
			var setSubmittedTerm = submittedTermState[1];
			var pageState = element.useState(1);
			var page = pageState[0];
			var setPage = pageState[1];
			var resultsState = element.useState([]);
			var results = resultsState[0];
			var setResults = resultsState[1];
			var hasMoreState = element.useState(false);
			var hasMore = hasMoreState[0];
			var setHasMore = hasMoreState[1];
			var searchingState = element.useState(false);
			var isSearching = searchingState[0];
			var setIsSearching = searchingState[1];
			var errorState = element.useState('');
			var error = errorState[0];
			var setError = errorState[1];

			function setWidth(width) {
				setAttributes({ width: Math.max(50, Math.min(2560, parseInt(width, 10) || 300)) });
			}

			function setFile(file) {
				setAttributes({ file: file });

				if (attributes.useAsFeatured) {
					updateFeaturedMeta(file);
				}
			}

			function useManualFile() {
				var file = manualFile.trim();

				if (file) {
					setFile(file);
					setIsModalOpen(false);
					setIsManualPopoverOpen(false);
				}
			}

			function setFeatured(value) {
				setAttributes({ useAsFeatured: value });
				updateFeaturedMeta(value ? attributes.file : '');
			}

			function selectCurrentBlock() {
				data.dispatch('core/block-editor').selectBlock(clientId);
			}

			function startResize(side, event) {
				var startX = event.clientX;
				var startWidth = parseInt(attributes.width, 10) || 300;

				event.preventDefault();
				event.stopPropagation();
				selectCurrentBlock();

				function onMove(moveEvent) {
					var delta = moveEvent.clientX - startX;
					setWidth(side === 'left' ? startWidth - delta : startWidth + delta);
				}

				function onEnd() {
					window.removeEventListener('mousemove', onMove);
					window.removeEventListener('mouseup', onEnd);
				}

				window.addEventListener('mousemove', onMove);
				window.addEventListener('mouseup', onEnd);
			}

			function resizeHandle(side) {
				return el('span', {
					'aria-hidden': true,
					onMouseDown: function(event) {
						startResize(side, event);
					},
					style: {
						background: '#fff',
						border: '1px solid #1e1e1e',
						borderRadius: '50%',
						boxSizing: 'border-box',
						cursor: 'ew-resize',
						height: '12px',
						left: side === 'left' ? '-6px' : 'auto',
						position: 'absolute',
						right: side === 'right' ? '-6px' : 'auto',
						top: '50%',
						transform: 'translateY(-50%)',
						width: '12px',
						zIndex: 2
					}
				});
			}

			function searchCommons(nextPage) {
				var term = searchTerm.trim();
				var targetPage = nextPage || 1;

				if (!term) {
					setResults([]);
					setError('');
					setHasMore(false);
					return;
				}

				setIsSearching(true);
				setError('');
				setSubmittedTerm(term);

				apiFetch({ path: searchPath(term, targetPage) })
					.then(function(data) {
						setResults(data.results || []);
						setPage(data.page || targetPage);
						setHasMore(!!data.hasMore);
					})
					.catch(function() {
						setResults([]);
						setHasMore(false);
						setError(__('Could not search Wikimedia Commons.', 'photocommons'));
					})
					.finally(function() {
						setIsSearching(false);
					});
			}

			function resultGrid() {
				if (isSearching) {
					return el(
						'div',
						{ className: 'photocommons-modal-loading' },
						el(Spinner)
					);
				}

				if (error) {
					return el('p', { className: 'photocommons-modal-error' }, error);
				}

				if (submittedTerm && !results.length) {
					return el('p', null, __('No images found.', 'photocommons'));
				}

				return el(
					'div',
					{
						className: 'photocommons-modal-results',
						style: {
							display: 'grid',
							gap: '12px',
							gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
							marginTop: '16px'
						}
					},
					results.map(function(result) {
						return el(
							Button,
							{
								key: result.id,
								onClick: function() {
									setAttributes({
										file: result.filename,
										author: result.author || '',
										license: result.license || '',
										licenseUrl: result.licenseUrl || ''
									});
									if (attributes.useAsFeatured) {
										updateFeaturedMeta(result.filename);
									}
									setIsModalOpen(false);
								},
								style: {
									border: attributes.file === result.filename ? '2px solid #3858e9' : '1px solid #dcdcde',
									display: 'block',
									height: 'auto',
									padding: '8px',
									textAlign: 'left',
									whiteSpace: 'normal'
								}
							},
							el('img', {
								src: result.thumbUrl,
								alt: '',
								style: {
									aspectRatio: '1 / 1',
									display: 'block',
									marginBottom: '8px',
									objectFit: 'cover',
									width: '100%'
								}
							}),
							el(
								'span',
								{
									style: {
										display: 'block',
										fontSize: '12px',
										lineHeight: '1.3',
										overflowWrap: 'anywhere'
									}
								},
								result.filename
							)
						);
					})
				);
			}

			function searchModal() {
				if (!isModalOpen) {
					return null;
				}

				return el(
					Modal,
					{
						title: attributes.file ? __('Replace Wikimedia Commons image', 'photocommons') : __('Select Wikimedia Commons image', 'photocommons'),
						onRequestClose: function() {
							setIsModalOpen(false);
						},
						isFullScreen: true
					},
					el(
						'div',
						{
							style: {
								alignItems: 'flex-end',
								background: '#f6f7f7',
								border: '1px solid #dcdcde',
								borderRadius: '2px',
								display: 'flex',
								gap: '12px',
								padding: '16px'
							}
						},
						el(
							'div',
							{ style: { flex: '1 1 auto' } },
							el(TextControl, {
								label: __('Search Wikimedia Commons', 'photocommons'),
								value: searchTerm,
								onChange: setSearchTerm,
								onKeyDown: function(event) {
									if (event.key === 'Enter') {
										event.preventDefault();
										searchCommons(1);
									}
								},
								placeholder: __('Search images', 'photocommons')
							})
						),
						el(
							'div',
							{ style: { flex: '0 0 auto', marginBottom: '8px' } },
							el(
								Button,
								{
									variant: 'primary',
									onClick: function() {
										searchCommons(1);
									},
									disabled: isSearching
								},
								__('Search', 'photocommons')
							)
						)
					),
					resultGrid(),
					submittedTerm && el(
						Flex,
						{
							justify: 'space-between',
							style: {
								borderTop: '1px solid #dcdcde',
								marginTop: '16px',
								paddingTop: '16px'
							}
						},
						el(
							Button,
							{
								disabled: page <= 1 || isSearching,
								onClick: function() {
									searchCommons(page - 1);
								}
							},
							__('Previous', 'photocommons')
						),
						el('span', null, __('Page', 'photocommons') + ' ' + page),
						el(
							Button,
							{
								disabled: !hasMore || isSearching,
								onClick: function() {
									searchCommons(page + 1);
								}
							},
							__('Next', 'photocommons')
						)
					)
				);
			}

			function imageControls() {
				return el(
					'div',
					null,
					el(TextControl, {
						label: __('Commons file name', 'photocommons'),
						value: attributes.file,
						onChange: setFile,
						placeholder: 'Example.jpg'
					}),
					el(TextControl, {
						label: __('Width', 'photocommons'),
						type: 'number',
						min: 1,
						max: 2560,
						value: attributes.width,
						onChange: function(value) {
							setWidth(value);
						}
					}),
					el(RangeControl, {
						label: __('Image size', 'photocommons'),
						min: 50,
						max: 1600,
						value: attributes.width,
						onChange: setWidth
					}),
					el(SelectControl, {
						label: __('Alignment', 'photocommons'),
						value: attributes.align,
						options: [
							{ label: __('None', 'photocommons'), value: 'none' },
							{ label: __('Left', 'photocommons'), value: 'left' },
							{ label: __('Center', 'photocommons'), value: 'center' },
							{ label: __('Right', 'photocommons'), value: 'right' }
						],
						onChange: function(value) {
							setAttributes({ align: value });
						}
					}),
					el(CheckboxControl, {
						label: __('Use as featured image instead of inserting in post content', 'photocommons'),
						checked: attributes.useAsFeatured,
						onChange: setFeatured
					})
				);
			}

			function manualNamePopover() {
				if (!isManualPopoverOpen) {
					return null;
				}

				return el(
					Popover,
					{
						onClose: function() {
							setIsManualPopoverOpen(false);
						},
						placement: 'bottom-start'
					},
					el(
						'div',
						{
							style: {
								minWidth: '280px',
								padding: '16px'
							}
						},
						el(TextControl, {
							label: __('Commons file name', 'photocommons'),
							value: manualFile,
							onChange: setManualFile,
							onKeyDown: function(event) {
								if (event.key === 'Enter') {
									event.preventDefault();
									useManualFile();
								}
							},
							placeholder: 'Example.jpg'
						}),
						el(
							Button,
							{
								variant: 'primary',
								onClick: useManualFile,
								disabled: !manualFile.trim()
							},
							__('Insert', 'photocommons')
						)
					)
				);
			}

			var controls = el(
				InspectorControls,
				null,
				el(
					PanelBody,
					{
						title: __('Image settings', 'photocommons'),
						initialOpen: true
					},
					imageControls()
				)
			);
			var blockToolbar = attributes.file && isSelected && el(
				BlockControls,
				null,
				AlignmentToolbar && el(AlignmentToolbar, {
					alignmentControls: [
						{ align: 'left', title: __('Align left', 'photocommons') },
						{ align: 'center', title: __('Align center', 'photocommons') },
						{ align: 'right', title: __('Align right', 'photocommons') }
					],
					controls: ['left', 'center', 'right'],
					value: attributes.align === 'none' ? undefined : attributes.align,
					onChange: function(value) {
						setAttributes({ align: value || 'none' });
					}
				}),
				el(
					ToolbarGroup,
					null,
					el(ToolbarButton, {
						icon: 'update',
						label: __('Replace', 'photocommons'),
						text: __('Replace', 'photocommons'),
						onClick: function() {
							setIsModalOpen(true);
						}
					})
				)
			);

			if (!attributes.file) {
				return el(
					'div',
					blockProps,
					blockToolbar,
					controls,
					searchModal(),
					el(
						Placeholder,
						{
							icon: 'format-image',
							label: __('PhotoCommons', 'photocommons'),
							instructions: __('Search Wikimedia Commons or insert a known Commons file name.', 'photocommons')
						},
						el(
							'div',
							{
								style: {
									alignItems: 'center',
									display: 'flex',
									gap: '8px',
									position: 'relative'
								}
							},
							el(
								Button,
								{
									variant: 'primary',
									onClick: function() {
										setIsModalOpen(true);
									}
								},
								__('Search', 'photocommons')
							),
							el(
								Button,
								{
									variant: 'secondary',
									onClick: function() {
										setIsManualPopoverOpen(true);
									}
								},
								__('Insert by name', 'photocommons')
							),
							manualNamePopover()
						)
					)
				);
			}

			return el(
				'div',
				blockProps,
				blockToolbar,
				controls,
				searchModal(),
				attributes.useAsFeatured && el(
					'p',
					null,
					__('This Commons image will be used as the featured image when the post is saved. It will not be inserted in the post content.', 'photocommons')
				),
				!attributes.useAsFeatured && el(
					'figure',
					{
						className: getAlignmentClass(attributes.align),
						style: getFigureStyle(attributes.align)
					},
					el('img', {
						src: getThumbUrl(attributes.file, attributes.width),
						alt: attributes.file,
						style: {
							display: 'block',
							height: 'auto',
							maxWidth: '100%',
							width: attributes.width ? attributes.width + 'px' : undefined
						}
					}),
					(attributes.author || attributes.license) && el(
						'figcaption',
						{
							className: 'wp-element-caption',
							style: {
								fontSize: '13px',
								color: '#555',
								marginTop: '4px'
							},
							dangerouslySetInnerHTML: {
								__html: (function() {
									var captionParts = [];
									if (attributes.author) {
										captionParts.push(sprintf(__('Photo by %s', 'photocommons'), attributes.author));
									} else {
										captionParts.push(__('Photo via Wikimedia Commons', 'photocommons'));
									}

									if (attributes.license) {
										var licenseText = attributes.license;
										if (/^cc-by/i.test(licenseText)) {
											licenseText = licenseText.toUpperCase();
										}
										var licenseHtml = licenseText;
										if (attributes.licenseUrl) {
											licenseHtml = '<a href="' + attributes.licenseUrl + '" target="_blank" rel="noopener noreferrer">' + licenseText + '</a>';
										}
										captionParts.push(sprintf(__('License: %s', 'photocommons'), licenseHtml));
									}

									return captionParts.join('. ') + '.';
								})()
							}
						}
					),
					isSelected && resizeHandle('left'),
					isSelected && resizeHandle('right')
				)
			);
		},
		save: function() {
			return null;
		}
	});

})(window.wp.blocks, window.wp.blockEditor, window.wp.components, window.wp.data, window.wp.element, window.wp.i18n, window.wp.apiFetch);
