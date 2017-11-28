var contexts = {
  detached_rhino: null,

  active_ctx: null,
  perf: null,

  todayndb: {},
  yesterdayndb: {},
  weekndb: {},
  lastweekndb: {},

  reqpct_chart: null,

  clean_slate: function(){
    contexts.todayndb = {};
    contexts.yesterdayndb = {};
    contexts.weekndb = {};
    contexts.lastweekndb = {};
  },

  gen_overview: function(){

    /* parsing */
    var curr = util.get_today_date(),
        today = curr.getTime() / 1000;

    curr.setDate(curr.getDate() - 1);
    yesterday = curr.getTime() / 1000;

    curr.setDate(curr.getDate() - 5);
    week = curr.getTime() / 1000;

    curr.setDate(curr.getDate() - 7);
    lastweek = curr.getTime() / 1000;

    var todayndb = yesterdayndb = weekndb = lastweekndb = todaynreq = yesterdaynreq = weeknreq = lastweeknreq = 0;

    for (i = 0, len = contexts.perf.length; i != len; ++i) {
      var stime = contexts.perf[i].starttime,
          etime = contexts.perf[i].endtime;
      if (stime >= today) {
        if (contexts.todayndb[contexts.perf[i].dbname] == null)
          contexts.todayndb[contexts.perf[i].dbname] = contexts.perf[i].context_count;
        else
          contexts.todayndb[contexts.perf[i].dbname] += contexts.perf[i].context_count;
      } else if (stime >= yesterday) {
        if (contexts.yesterdayndb[contexts.perf[i].dbname] == null)
          contexts.yesterdayndb[contexts.perf[i].dbname] = contexts.perf[i].context_count;
        else
          contexts.yesterdayndb[contexts.perf[i].dbname] += contexts.perf[i].context_count;
      }

      if (stime >= week) {
        if (contexts.weekndb[contexts.perf[i].dbname] == null)
          contexts.weekndb[contexts.perf[i].dbname] = contexts.perf[i].context_count;
        else
          contexts.weekndb[contexts.perf[i].dbname] += contexts.perf[i].context_count;
      } else if (stime >= lastweek) {
        if (contexts.lastweekndb[contexts.perf[i].dbname] == null)
          contexts.lastweekndb[contexts.perf[i].dbname] = contexts.perf[i].context_count;
        else
          contexts.lastweekndb[contexts.perf[i].dbname] += contexts.perf[i].context_count;
      }
    }

    for (var key in contexts.todayndb) {
      ++todayndb;
      todaynreq += contexts.todayndb[key];
    }
      
    for (var key in contexts.yesterdayndb) {
      ++yesterdayndb;
      yesterdaynreq += contexts.yesterdayndb[key];
    }
      
    for (var key in contexts.weekndb) {
      ++weekndb;
      weeknreq += contexts.weekndb[key];
    }

    for (var key in contexts.lastweekndb) {
      ++lastweekndb;
      lastweeknreq += contexts.lastweekndb[key];
    }

    var html = '';
    /* { Request card */
    html += '<div class="col-md-6 well-dbcard">';
    html += '  <div class="well well-sm row">';
    html += '    <div class="content">';

    html += '<h5 class="caption">Requests';
    html += '<div class="btn-group btn-group-xs pull-right" role="group" aria-label="...">';
    html += '<button type="button" class="btn btn-default active" id="reqctxbtn-day" ';
    html += 'val="' + todaynreq + '" cmp="' + yesterdaynreq +'"';
    html += 'show="day"';
    html += '>Today</button>';
    html += '<button type="button" class="btn btn-default" id="reqctxbtn-week" ';
    html += 'val="' + weeknreq + '" cmp="' + lastweeknreq +'"';
    html += 'show="week"';
    html += '>7-Day</button>';
    html += '</div></h5>';

    html += '<div class="col-md-3 clear-padl data-left"></div>';
    html += '<div class="col-md-9 clear-padr data-right">';
    html += '<div class="c3graph" id="reqpct-chart"></div>';
    html += '</div>';

    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    /* End the card } */

    /* { database card */
    html += '<div class="col-md-6 well-dbcard">';
    html += '  <div class="well well-sm row">';
    html += '    <div class="content">';

    /* header */
    html += '<h5 class="caption">Contexts';
    html += '<div class="btn-group btn-group-xs pull-right" role="group" aria-label="...">';
    html += '<button type="button" class="btn btn-default active" id="dbbadgebtn-day" ';
    html += 'val="' + todayndb + '" cmp="' + yesterdayndb +'" ';
    html += 'show="#dbtbl-day_wrapper"';
    html += '>Today</button>';
    html += '<button type="button" class="btn btn-default" id="dbbadgebtn-week" ';
    html += 'val="' + weekndb + '" cmp="' + lastweekndb +'" ';
    html += 'show="#dbtbl-week_wrapper"';
    html += '>7-Day</button>';
    html += '</div></h5>';

    /* left */
    html += '<div class="col-md-3 clear-padl data-left"></div>';
    /* { right */
    html += '<div class="col-md-9 clear-padr data-right">';

    /* { Daily table */
    html += '<table class="table table-hover table-bordered" id="dbtbl-day">';
    html += '<thead><tr><th colspan="2">Today</th><th colspan="2">Yesterday</th></tr>';
    html += '<tr><th>#</th><th>Context</th><th>#</th><th>Context</th></tr></thead><tbody>';

    var rows1 = [], rows2 = [];
    for (var k in contexts.todayndb)
      rows1.push(k);
    for (var k in contexts.yesterdayndb)
      rows2.push(k);

    for (var i = 0, len1 = rows1.length, len2 = rows2.length;
            i < len1 || i < len2; ++i) {
      var cell1 = i < len1 ? rows1[i] : '',
          cell2 = i < len2 ? rows2[i] : '';
      html += '<tr><th>' + (i < len1 ? (i + 1) : '') + '</th><td>' + cell1 + '</td></th>';
      html += '<th>' + (i < len2 ? (i + 1) : '') + '</th><td>' + cell2 + '</td></th></tr>';
    }
    html += '</tbody></table>';
    /* Daily table } */

    /* { Weekly table */
    html += '<table class="table table-hover table-bordered" id="dbtbl-week">';
    html += '<thead><tr><th colspan="2">7-Day</th><th colspan="2">8-14 Day</th></tr>';
    html += '<tr><th>#</th><th>Context</th><th>#</th><th>Context</th></tr></thead><tbody>';

    rows1 = [];
    rows2 = [];
    for (var k in contexts.weekndb)
      rows1.push(k);
    for (var k in contexts.lastweekndb)
      rows2.push(k);

    for (var i = 0, len1 = rows1.length, len2 = rows2.length;
            i < len1 || i < len2; ++i) {
      var cell1 = i < len1 ? rows1[i] : '',
          cell2 = i < len2 ? rows2[i] : '';
      html += '<tr><th>' + (i < len1 ? (i + 1) : '') + '</th><td>' + cell1 + '</td></th>';
      html += '<th>' + (i < len2 ? (i + 1) : '') + '</th><td>' + cell2 + '</td></th></tr>';
    }
    html += '</tbody></table>'; /* Weekly table } */
    html += '</div>'; /* { right */

    html += '    </div>';
    html += '  </div>';
    html += '</div>';
    /* End the card } */

    $('#contexts-detail-view').append($(html));

    /* Charts */
    var piecolumns_day = [], piecolumns_week = [];
    for (var k in contexts.weekndb)
      piecolumns_week.push([k, contexts.weekndb[k]]);
    for (var k in contexts.todayndb)
      piecolumns_day.push([k, contexts.todayndb[k]]);

    var piecolumns = {};
    piecolumns.day = piecolumns_day;
    piecolumns.week = piecolumns_week;

    contexts.reqpct_chart = c3.generate({
      bindto: '#reqpct-chart',
      data: {
        columns: [],
        type: 'pie'
      }
    });

    /* DataTables */
    $('#dbtbl-day, #dbtbl-week').DataTable({
      scrollY: "160px",
      scrollCollapse: true,
      paging: false
    });

    /* Events */
    $('#dbbadgebtn-day, #dbbadgebtn-week').click(function(e){
      $('#dbbadgebtn-day, #dbbadgebtn-week').removeClass('active');

      var val = parseInt($(this).attr('val'));
          cmp = parseInt($(this).attr('cmp'));
      var pricetag = '<h3>' + val + '<span class="pricetag label pull-right label-';
      pricetag += (val >= cmp) ? 'success' : 'danger';
      pricetag += '">';
      pricetag += (val >= cmp) ? '+' : '';
      pricetag += (val - cmp);
      pricetag += '</span></h3>';
      $(this).addClass('active').parent().parent().parent().find('.data-left').html(pricetag);

      $('#dbtbl-day_wrapper, #dbtbl-week_wrapper').hide();
      $($(this).addClass('active').attr('show')).show();
    });

    $('#reqctxbtn-day, #reqctxbtn-week').click(function(e){
      $('#reqctxbtn-day, #reqctxbtn-week').removeClass('active');

      var val = parseInt($(this).attr('val'));
          cmp = parseInt($(this).attr('cmp'));
      var pricetag = '<h3>' + util.num_to_human_readable(val);
      pricetag += '<span class="pricetag label pull-right label-';
      pricetag += (val >= cmp) ? 'success' : 'danger';
      pricetag += '">';
      pricetag += (val >= cmp) ? '+' : '';
      pricetag += (cmp == 0 || val == 0) ? '&infin;' : (((val / cmp - 1) * 100).toFixed(2) + '%');
      pricetag += '</span></h3>';
      $(this).addClass('active').parent().parent().parent().find('.data-left').html(pricetag);

      contexts.reqpct_chart.unload();
      contexts.reqpct_chart.load({
        columns: piecolumns[$(this).attr('show')]
      });
    });

    $('#dbbadgebtn-day, #reqctxbtn-day').click();
  },

  gen_databases: function(e){
    var card = $(util.gen_card_12());
    var html = '';
    html += '<h5 class="caption">Daily Requests per Database';

    html += '<div id="rpdrngs" class="btn-group btn-group-xs pull-right" role="group" aria-label="...">';
    html += '<button type="button" class="btn btn-default active" show="today">';
    html += 'Today';
    html += '</button>';
    html += '<button type="button" class="btn btn-default" show="7day">';
    html += '7-Day';
    html += '</button>';
    html += '<button type="button" class="btn btn-default" show="14day">';
    html += '14-Day';
    html += '</button>';
    html += '</div>';

    html += '<div id="rpdbtns" class="btn-group btn-group-xs pull-right" role="group" aria-label="...">';
    html += '<button type="button" class="btn btn-default active" show="line">';
    html += 'Line';
    html += '</button>';
    html += '<button type="button" class="btn btn-default" show="bar">';
    html += 'Bar';
    html += '</button>';
    html += '<button type="button" class="btn btn-default" show="stacked">';
    html += 'Stacked';
    html += '</button>';
    html += '</div> ';

    html += '</h5>';
    card.find('.content').append(html).append(util.gen_graph('reqctx-chart')).append('<hr/>');
    $('#detail-view').append(card);

    html = '';
    html += '<h5 class="caption">Request Rate per Context';

    html += '<div id="rrpdrngs" class="btn-group btn-group-xs pull-right" role="group" aria-label="...">';
    html += '<button type="button" class="btn btn-default active" show="today">';
    html += 'Today';
    html += '</button>';
    html += '<button type="button" class="btn btn-default" show="7day">';
    html += '7-Day';
    html += '</button>';
    html += '<button type="button" class="btn btn-default" show="14day">';
    html += '14-Day';
    html += '</button>';
    html += '</div>';

    html += '<div id="rrpdbtns" class="btn-group btn-group-xs pull-right" role="group" aria-label="...">';
    html += '<button type="button" class="btn btn-default active" show="step">';
    html += 'Step';
    html += '</button>';
    html += '<button type="button" class="btn btn-default" show="area-step">';
    html += 'Area Step';
    html += '</button>';
    html += '</div></h5>';
    card.find('.content').append(html).append(util.gen_graph('reqrctx-chart'));
    $('#contexts-detail-view').append(card);

    /* Charts */

    var curr = new Date();
    curr.setHours(0);
    curr.setMinutes(0);
    curr.setSeconds(0);
    curr.setMilliseconds(0);
    curr.setDate(curr.getDate() - 13);

    /* Construct my 2-d array */
    var columnmap = {};
    for (var key in contexts.weekndb) {
      if (columnmap[key] == null)
        columnmap[key] = [];
    }

    for (var key in contexts.lastweekndb) {
      if (columnmap[key] == null)
        columnmap[key] = [];
    }

    var xvals = {}, rowvals = {}, xsvals = {}, columnvals = [];
    var grouparr = [];
    for (var key in columnmap) {
      var subarray = new Array(14);
      for (var i = 0; i != 14; ++i)
        subarray[i] = 0;
      columnmap[key] = subarray;
      grouparr.push(key);

      xvals[key] = ['x' + key];
      rowvals[key] = [key];
      xsvals[key] = 'x' + key;
      columnvals.push(xvals[key], rowvals[key]);
    }

    /* date array */
    var dates = new Array(14);
    for (var i = 0; i != 14; ++i) {
      dates[i] = curr.getTime() / 1000;
      curr.setDate(curr.getDate() + 1);
    }

    /* Now fill in data */
    for (var i = 0, len = contexts.perf.length; i != len; ++i) {
      var db = contexts.perf[i].dbname;
      var cnt = contexts.perf[i].context_count;
      var stime = contexts.perf[i].starttime;
      var etime = contexts.perf[i].endtime;
      var rate = 60 * cnt / (etime - stime);

      /* look up the value in `dates' array so we know the position to add the count to. */
      var j = 13;
      for (; j >= 0; --j)
        if (stime >= dates[j])
          break;

      if (j >= 0)
        columnmap[db][j] += cnt;

      xvals[db].push(stime);
      rowvals[db].push(rate);
    }

    /* Transform to what C3 wants */

    dates.unshift('x');
    var columns = [dates];
    for (var key in columnmap) {
      columnmap[key].unshift(key);
      columns.push(columnmap[key]);
    }

    contexts.reqctx_chart = c3.generate({
       bindto: '#reqctx-chart',
       padding: {
         right: 15
       },
       data: {
         x: 'x',
         columns: columns
       },
       axis: {
         x: {
           tick: {
             format: function(x) {
               return new Date(x * 1000).toISOString().slice(0, 10);
             }
           }
         }
       },
       subchart: {
        show: true
       },
       zoom: {
         enabled: true,
         rescale: true,
         extent: [1, 100]
       },
       transition: {
         duration: 0
       }
    });

    contexts.reqrctx_chart = c3.generate({
       bindto: '#reqrctx-chart',
       padding: {
         right: 15
       },
       data: {
         xs: xsvals,
         columns: columnvals,
         type: 'step'
       },
       tooltip: {
         format: {
           value: function(value, ratio, id, index) {
             return value.toFixed(2);
           }
         }
       },
       line: {
         step: {
           type: 'step-after'
         }
       },
       axis: {
         x: {
           tick: {
             format: function(x) {
               return new Date(x * 1000).toISOString().slice(0, 19);
             }
           }
         },
         y: {
           label: 'requests/minute'
         }
       },
       subchart: {
        show: true
       },
       zoom: {
         enabled: true,
         rescale: true,
         extent: [1, 100]
       },
       transition: {
         duration: 0
       }
    });


    /* Events */

    /* Chart styles */
    $('#rpdbtns button').click(function(){
      $('#rpdbtns button').removeClass('active');
      $(this).addClass('active');
      if ($(this).attr('show') != 'stacked') {
        contexts.reqctx_chart.transform($(this).attr('show'));
        contexts.reqctx_chart.groups([]);
      } else {
        contexts.reqctx_chart.transform('bar');
        contexts.reqctx_chart.groups([grouparr]);
      }
    });

    $('#rrpdbtns button').click(function(){
      $('#rrpdbtns button').removeClass('active');
      $(this).addClass('active');
      contexts.reqrctx_chart.transform($(this).attr('show'));
    });

    /* Chart ranges */

    $('#rpdrngs button').click(function(){
      $('#rpdrngs button').removeClass('active');
      $(this).addClass('active');
      var show = $(this).attr('show');

      /* Create a new date everytime. Don't want to mess 
         with javascript's weird variable scope. */
      var currd = util.get_today_date();
      var end = currd.getTime() / 1000, start;

      if (show == 'today') {
        /* today is already the last entry, so include yesterday as well. */
        start = currd.setDate(currd.getDate() - 1) / 1000;
      } else if (show == '7day') {
        start = currd.setDate(currd.getDate() - 6) / 1000;
      } else if (show == '14day') {
        start = currd.setDate(currd.getDate() - 13) / 1000;
      } else {
        alert('Unknown date range.');
        return;
      }
      contexts.reqctx_chart.zoom([start, end]);
    });

    $('#rpdrngs button.active').click();

    $('#rrpdrngs button').click(function(){
      $('#rrpdrngs button').removeClass('active');
      $(this).addClass('active');
      var show = $(this).attr('show');

      /* Create a new date everytime. Don't want to mess 
         with javascript's weird variable scope. */
      var currd = new Date();
      var end = currd.getTime() / 1000, start;
      var ealiest = contexts.perf[0].starttime;
      var latest = contexts.perf[contexts.perf.length - 1].starttime;

      currd.setHours(0);
      currd.setMinutes(0);
      currd.setSeconds(0);
      currd.setMilliseconds(0);

      if (show == 'today') {
        start = currd.getTime() / 1000;
      } else if (show == '7day') {
        start = currd.setDate(currd.getDate() - 6) / 1000;
      } else if (show == '14day') {
        start = currd.setDate(currd.getDate() - 13) / 1000;
      } else {
        alert('Unknown date range.');
        return;
      }
      contexts.reqrctx_chart.zoom([start > ealiest ? start : ealiest, end < latest ? end : latest]);
    });

    $('#rrpdrngs button.active').click();
  },

  gen_ctx_ui: function(){
    console.log('Generating screen.');
    contexts.gen_overview();
    contexts.gen_databases();

    loading.stop();
    $('#contexts-detail-view .row').css('visibility', 'visible');
  },

  load_ctx: function(ctx){
    contexts.active_ctx = ctx;
    /* Only load the selected context. */
    var local_dbs = ($('#search_keyword').attr('t') == 1) ?
        $('#search_result_dropdown').val() : $('#search_keyword').attr('q');
    console.log('Loading ' + ctx + '(' + local_dbs + ')');

    $.ajax({
       url: 'get_context_details',
       data: 'q=' + ctx + '&dbs=' + local_dbs
    }).fail(function(xhr){
      loading.stop();
      contexts.detached_rhino = $('#loading-screen-contexts').detach();

      $('#contexts-detail-view').html($('<h3 style="text-align:center">' +
                                       xhr.responseText + '</h3>'));
    }).done(function(data){
      contexts.perf = data.perf;

      console.log('Done parsing.');
      contexts.gen_ctx_ui();
    });
  },

  load_list: function(){
    /* Show loading animation. */
    loading.stop();
    $('#contexts-detail-view').html('');
    $('#placeholder .submodule').hide();
    $('#placeholder').show();
    loading.start('#loading-screen-contexts');

    /* Load contexts */
    var local_ctxs = ($('#search_keyword').attr('t') == 2) ?
        $('#search_result_dropdown').val() : $('#search_keyword').attr('q');
    console.log('Contexts are ' + local_ctxs);

    /* We don't need to contact backend. Just insert contexts 
       into the panel. */

    /* Make an array and sort */
    if (!$.isArray(local_ctxs))
      local_ctxs = local_ctxs.split(',');
    local_ctxs.sort();

    var tbody = '';
    for (var i = 0, len = local_ctxs.length; i != len; ++i) {
      var tr = '<tr style="cursor: pointer;" ctx="' + local_ctxs[i] + '">';
      tr += '<th>' + local_ctxs[i] + '</th>';
      tr += '</tr>';
      tbody += tr;
    }

    $('#contexts_tbody').html(tbody);

    /* Bind click event to rows */
    $('#contexts_tbody tr').click(function(e){
      if ($(this).attr('pop') == 1)
        return;

      $('#contexts_tbody tr').attr('pop', 0).removeClass('hovered');
      $(this).addClass('hovered');
      $(this).attr('pop', 1);

      contexts.clean_slate();

      /* Always detach loading screen before wiping out the view. */
      contexts.detached_rhino = $('#loading-screen-contexts').detach();
      $('#contexts-detail-view').html('');
      $('#contexts-detail-view').append(contexts.detached_rhino);

      loading.stop();
      loading.start('#loading-screen-contexts');

      contexts.load_ctx($(this).attr('ctx'));
    });

    $('#placeholder .submodule').show();
    $('#contexts_tbody tr').first().click();
  }
}

contexts.load_list();
