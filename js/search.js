var PhotoCommons = {
        getQueryUrl: function( type, args ) {
            var queries = {
                // Used for the suggestions
                'pagesearch' : function(q) {
                    return {
                        'action' : 'opensearch',
                        'search' : q.search
                    };
                },
                /* http://commons.wikimedia.org/w/api.php
                    ? action=query
                    & generator=images
                    & gimlimit=20
                    & indexpageids=1
                    & titles=Cat
                    & redirects=1
                    & prop=imageinfo
                    & iiprop=url
                    & iiurlwidth=200
                */
                'pageimages' : function(q) {
                    return {
                        'action' : 'query',
                        'generator' : 'images',
                        'gimlimit' : '20',
                        'indexpageids' : '1',
                        'titles' : q.title,
                        'redirects' : '1',
                        'prop' : 'imageinfo',
                        'iiprop' : 'url',
                        'iiurlwidth' : q.width
                    };
                }
            };

            if (!queries[type]) {
                throw new Error( 'Unknown query type' );
            }

            return PhotoCommons.makeUrl(queries[type](args));
        },

        makeUrl: function( args ) {
            // default arguments
            args = $.extend({
                'format' : 'json',
                'callback' : '!noencode!?'
            }, args);


            var url = 'https://commons.wikimedia.org/w/api.php',
                first = true,
                key,
                value;
            for ( key in args ) {
                value = args[key];
                url += (first) ? '?' : '&';
                first = false;

                if ( typeof value === 'string' && value.indexOf( '!noencode!' ) === 0 ) {
                    value = value.slice( 10 );
                } else {
                    value = encodeURIComponent( value );
                }

                url += encodeURIComponent( key ) + '=' + value;
            }
            return url;
        },

        init: function() {

            /* jQuery suggestions */
            $( '#wp-photocommons-search' ).suggestions( {
                fetch: function( query ) {
                    var url = PhotoCommons.getQueryUrl( 'pagesearch', {
                        'search' : query
                    });
                    $.getJSON( url, function( data ) {
                        $( '#wp-photocommons-search' ).suggestions( 'suggestions', data[1] );
                    });
                },
                cancel: function() {
                    //...
                },
                maxRows: 0,
                result: {
                    select: function( $result ) {
                        var value = $result.val(),
                            url = PhotoCommons.getQueryUrl( 'pageimages', {
                                'title' : value,
                                'width' : '200'
                            });

                        $( '#wp-photocommons-images' ).empty();
                        $( '#wp-photocommons-loading' ).show();
                        $.getJSON( url, function( data ) {

                            if ( !data.query || !data.query.pageids || !data.query.pageids.length ) {
                                $( '#wp-photocommons-images' ).text( PHOTOCOMMONS.translations['No images found.'] );
                            } else {
                                $.each( data.query.pageids, function( key, pageid ) {
                                    var img = data.query.pages[pageid],
                                        pagetitle;
                                    if ( img.imageinfo && img.imageinfo[0] ) {
                                        pagetitle = img.title.split(':');
                                        pagetitle.shift();
                                        pagetitle = pagetitle.join(':');
                                        $('<div class="image">')
                                            .css('background-image', 'url("' + img.imageinfo[0].thumburl + '")')
                                            .attr('data-filename', pagetitle)
                                            .appendTo('#wp-photocommons-images');

                                    }
                                });

                            }

                            $( '#wp-photocommons-loading' ).hide();
                        });
                    }
                }

            } );
        }
    };
