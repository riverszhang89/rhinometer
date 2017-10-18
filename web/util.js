util = {
  size_to_human_readable: function(sz) {
    var isz = parseInt(sz);
    if (isz < 1024)
      return isz + ' B';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' KiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' MiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' GiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' TiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' PiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' EiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' ZiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' YiB';

    return '42';
  },
  
  gen_header_h5: function(title, badge, style) {
    var ret = '';
    ret += '<h5 class="caption">';
    ret += title;
    if (badge != null) {
      ret += '<span class="label pull-right label-';
      ret += style;
      ret += '">';
      ret += badge;
      ret += '</span>';
    }
    ret += '</h5>';
    return ret;
  },
  
  gen_graph_card_6: function(title, badge, style, c3id) {
    var ret = '';
    ret += '<div class="col-md-6 clear-padl">';
    ret += util.gen_header_h5(title, badge, style);
    ret += '<div class="c3graph" id="';
    ret += c3id;
    ret += '"></div></div>';
    return ret;
  },

  gen_graph: function(c3id) {
    var ret = '';
    ret += '<div class="c3graph" id="';
    ret += c3id;
    ret += '"></div></div>';
    return ret;
  },
  
  gen_card_12: function() {
    var ret = '';
    ret += '<div class="col-md-12 row">';
    ret += '<div class="col-md-12 well-dbcard">';
    ret += '<div class="well well-sm">';
    ret += '<div class="content row">';
    ret += '</div></div></div></div>';
    return ret;
  },
  
  gen_badge: function(header, body, size) {
    var ret = '';
    ret += '<div class="col-md-';
    ret += size;
    ret += ' well-dbcard">';
    ret += '<div class="well well-sm">';
    ret += header
    ret += '<h3 class="content">' + body;
    ret += '</h3></div></div>';
    return ret;
  }
};
