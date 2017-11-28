var databases = {
  detached_rhino: null,
  active_host: null,
  active_db: null,
  term: null,
  perf: null,
  stats: [],
  memstat: {},
  dbsize: null,

  todaynctx: {},
  yesterdaynctx: {},
  weeknctx: {},
  lastweeknctx: {},

  rdwr_chart: null,
  hr_chart: null,
  mem_chart: null,
  nsql_chart: null,
  reqctx_chart: null,
  reqrctx_chart: null,
  reqpct_chart: null,

  clean_slate: function(){
    databases.memstat = {};
    databases.stats = [];
    databases.todaynctx = {};
    databases.yesterdaynctx = {};
    databases.weeknctx = {};
    databases.lastweeknctx = {};
  },

  gen_db_ui: function(){
    if (databases.stats.length == 0) {
      alert('Did not receive any data from server.');
      return;
    }
    /* The detail view now owns the loading screen.
       Don't destroy it. */
    console.log('Generating screen.');
    databases.gen_overview();
    databases.gen_contexts();
    databases.gen_host_table();
    databases.gen_pg_hitrate();
    console.log('Screen generated.');
    loading.stop();
    $('#detail-view .row').css('visibility', 'visible');
  },

  gen_overview: function(){
    var tothitrate = 0,
        totpgrd = 0,
        totpgwr = 0,
        totnsql = 0,
        today,
        yesterday,
        week,
        lastweek,
        todaynctx = 0,
        yesterdaynctx = 0,
        weeknctx = 0,
        lastweeknctx = 0,
        len, i;

    var curr = util.get_today_date();
    today = curr.getTime() / 1000;

    curr.setDate(curr.getDate() - 1);
    yesterday = curr.getTime() / 1000;

    curr.setDate(curr.getDate() - 5);
    week = curr.getTime() / 1000;

    curr.setDate(curr.getDate() - 7);
    lastweek = curr.getTime() / 1000;

    for (i = 0, len = databases.perf.length; i != len; ++i) {
      var stime = databases.perf[i].starttime;
      if (stime >= today) {
        if (databases.todaynctx[databases.perf[i].context] == null)
          databases.todaynctx[databases.perf[i].context] = databases.perf[i].context_count;
        else
          databases.todaynctx[databases.perf[i].context] += databases.perf[i].context_count;
      } else if (stime >= yesterday) {
        if (databases.yesterdaynctx[databases.perf[i].context] == null)
          databases.yesterdaynctx[databases.perf[i].context] = databases.perf[i].context_count;
        else
          databases.yesterdaynctx[databases.perf[i].context] += databases.perf[i].context_count;
      }

      if (stime >= week) {
        if (databases.weeknctx[databases.perf[i].context] == null)
          databases.weeknctx[databases.perf[i].context] = databases.perf[i].context_count;
        else
          databases.weeknctx[databases.perf[i].context] += databases.perf[i].context_count;
      } else if (stime >= lastweek) {
        if (databases.lastweeknctx[databases.perf[i].context] == null)
          databases.lastweeknctx[databases.perf[i].context] = databases.perf[i].context_count;
        else
          databases.lastweeknctx[databases.perf[i].context] += databases.perf[i].context_count;
      }
    }

    var todaynreq = yesterdaynreq = weeknreq = lastweeknreq = 0;

    for (var key in databases.todaynctx) {
      ++todaynctx;
      todaynreq += databases.todaynctx[key];
    }
      
    for (var key in databases.yesterdaynctx) {
      ++yesterdaynctx;
      yesterdaynreq += databases.yesterdaynctx[key];
    }
      
    for (var key in databases.weeknctx) {
      ++weeknctx;
      weeknreq += databases.weeknctx[key];
    }

    for (var key in databases.lastweeknctx) {
      ++lastweeknctx;
      lastweeknreq += databases.lastweeknctx[key];
    }

    for (i = 0, len = databases.stats.length; i != len; ++i) {
      var stat = databases.stats[i];
      if (!stat.online)
          continue;
      tothitrate += stat.hitrate;
      totpgrd += stat.pgrd;
      totpgwr += stat.pgwr;
      totnsql += stat.nsql;
    }

    var overview_html = '';

    /* { Request card */
    overview_html += '<div class="col-md-6 well-dbcard">';
    overview_html += '  <div class="well well-sm row">';
    overview_html += '    <div class="content">';

    overview_html += '<h5 class="caption">Requests';
    overview_html += '<div class="btn-group btn-group-xs pull-right" role="group" aria-label="...">';
    overview_html += '<button type="button" class="btn btn-default active" id="reqbadgebtn-day" ';
    overview_html += 'val="' + todaynreq + '" cmp="' + yesterdaynreq +'"';
    overview_html += 'show="day"';
    overview_html += '>Today</button>';
    overview_html += '<button type="button" class="btn btn-default" id="reqbadgebtn-week" ';
    overview_html += 'val="' + weeknreq + '" cmp="' + lastweeknreq +'"';
    overview_html += 'show="week"';
    overview_html += '>7-Day</button>';
    overview_html += '</div></h5>';

    overview_html += '<div class="col-md-3 clear-padl data-left"></div>';
    overview_html += '<div class="col-md-9 clear-padr data-right">';
    overview_html += '<div class="c3graph" id="reqpct-chart"></div>';
    overview_html += '</div>';

    overview_html += '    </div>';
    overview_html += '  </div>';
    overview_html += '</div>';
    /* End the card } */

    /* { Context card */
    overview_html += '<div class="col-md-6 well-dbcard">';
    overview_html += '  <div class="well well-sm row">';
    overview_html += '    <div class="content">';

    /* header */
    overview_html += '<h5 class="caption">Contexts';
    overview_html += '<div class="btn-group btn-group-xs pull-right" role="group" aria-label="...">';
    overview_html += '<button type="button" class="btn btn-default active" id="ctxbadgebtn-day" ';
    overview_html += 'val="' + todaynctx + '" cmp="' + yesterdaynctx +'" ';
    overview_html += 'show="#ctxtbl-day_wrapper"';
    overview_html += '>Today</button>';
    overview_html += '<button type="button" class="btn btn-default" id="ctxbadgebtn-week" ';
    overview_html += 'val="' + weeknctx + '" cmp="' + lastweeknctx +'" ';
    overview_html += 'show="#ctxtbl-week_wrapper"';
    overview_html += '>7-Day</button>';
    overview_html += '</div></h5>';

    /* left */
    overview_html += '<div class="col-md-3 clear-padl data-left"></div>';
    /* { right */
    overview_html += '<div class="col-md-9 clear-padr data-right">';

    /* { Daily table */
    overview_html += '<table class="table table-hover table-bordered" id="ctxtbl-day">';
    overview_html += '<thead><tr><th colspan="2">Today</th><th colspan="2">Yesterday</th></tr>';
    overview_html += '<tr><th>#</th><th>Context</th><th>#</th><th>Context</th></tr></thead><tbody>';

    var rows1 = [], rows2 = [];
    for (var k in databases.todaynctx)
      rows1.push(k);
    for (var k in databases.yesterdaynctx)
      rows2.push(k);

    for (var i = 0, len1 = rows1.length, len2 = rows2.length;
            i < len1 || i < len2; ++i) {
      var cell1 = i < len1 ? rows1[i] : '',
          cell2 = i < len2 ? rows2[i] : '';
      overview_html += '<tr><th>' + (i < len1 ? (i + 1) : '') + '</th><td>' + cell1 + '</td></th>';
      overview_html += '<th>' + (i < len2 ? (i + 1) : '') + '</th><td>' + cell2 + '</td></th></tr>';
    }
    overview_html += '</tbody></table>';
    /* Daily table } */

    /* { Weekly table */
    overview_html += '<table class="table table-hover table-bordered" id="ctxtbl-week">';
    overview_html += '<thead><tr><th colspan="2">7-Day</th><th colspan="2">8-14 Day</th></tr>';
    overview_html += '<tr><th>#</th><th>Context</th><th>#</th><th>Context</th></tr></thead><tbody>';

    rows1 = [];
    rows2 = [];
    for (var k in databases.weeknctx)
      rows1.push(k);
    for (var k in databases.lastweeknctx)
      rows2.push(k);

    for (var i = 0, len1 = rows1.length, len2 = rows2.length;
            i < len1 || i < len2; ++i) {
      var cell1 = i < len1 ? rows1[i] : '',
          cell2 = i < len2 ? rows2[i] : '';
      overview_html += '<tr><th>' + (i < len1 ? (i + 1) : '') + '</th><td>' + cell1 + '</td></th>';
      overview_html += '<th>' + (i < len2 ? (i + 1) : '') + '</th><td>' + cell2 + '</td></th></tr>';
    }
    overview_html += '</tbody></table>'; /* Weekly table } */
    overview_html += '</div>'; /* { right */

    overview_html += '    </div>';
    overview_html += '  </div>';
    overview_html += '</div>';
    /* End the card } */

    $('#detail-view').append($(overview_html));

    /* Charts */
    var piecolumns_day = [], piecolumns_week = [];
    for (var k in databases.weeknctx)
      piecolumns_week.push([k, databases.weeknctx[k]]);
    for (var k in databases.todaynctx)
      piecolumns_day.push([k, databases.todaynctx[k]]);

    var piecolumns = {};
    piecolumns.day = piecolumns_day;
    piecolumns.week = piecolumns_week;

    databases.reqpct_chart = c3.generate({
      bindto: '#reqpct-chart',
      data: {
        columns: [],
        type: 'pie'
      }
    });

    /* DataTables */
    $('#ctxtbl-day, #ctxtbl-week').DataTable({
      scrollY: "160px",
      scrollCollapse: true,
      paging: false
    });

    /* Events */
    $('#ctxbadgebtn-day, #ctxbadgebtn-week').click(function(e){
      $('#ctxbadgebtn-day, #ctxbadgebtn-week').removeClass('active');

      var val = parseInt($(this).attr('val'));
          cmp = parseInt($(this).attr('cmp'));
      var pricetag = '<h3>' + val + '<span class="pricetag label pull-right label-';
      pricetag += (val >= cmp) ? 'success' : 'danger';
      pricetag += '">';
      pricetag += (val >= cmp) ? '+' : '';
      pricetag += (val - cmp);
      pricetag += '</span></h3>';
      $(this).addClass('active').parent().parent().parent().find('.data-left').html(pricetag);

      $('#ctxtbl-day_wrapper, #ctxtbl-week_wrapper').hide();
      $($(this).addClass('active').attr('show')).show();
    });

    $('#reqbadgebtn-day, #reqbadgebtn-week').click(function(e){
      $('#reqbadgebtn-day, #reqbadgebtn-week').removeClass('active');

      var val = parseInt($(this).attr('val'));
          cmp = parseInt($(this).attr('cmp'));
      var pricetag = '<h3>' + util.num_to_human_readable(val);
      pricetag += '<span class="pricetag label pull-right label-';
      pricetag += (val >= cmp) ? 'success' : 'danger';
      pricetag += '">';
      pricetag += (val >= cmp) ? '+' : '';
      pricetag += (cmp == 0 || val == 0) ? '&infin;' : (((val / cmp - 1) * 100).toFixed(2) + '%');
      pricetag += '</span><h3>';
      $(this).addClass('active').parent().parent().parent().find('.data-left').html(pricetag);

      databases.reqpct_chart.unload();
      databases.reqpct_chart.load({
        columns: piecolumns[$(this).attr('show')]
      });
    });

    $('#ctxbadgebtn-day, #reqbadgebtn-day').click();
  },

  gen_host_table: function() {
    /* Table */
    var card = $(util.gen_card_12());

    var host_table_html = '';

    /* node table */
    host_table_html += '<div class="col-md-6 clear-padl">';
    host_table_html += '<h5 class="caption">Nodes</h5>';
    host_table_html += '<table class="table table-hover">';

    for (var i = 0, len = databases.stats.length; i != len; ++i) {
      var stat = databases.stats[i];
      host_table_html += '<tr><td>' + stat.host;
      if (stat.master)
        host_table_html += ' <span class="label label-primary">master</span>';
      if (!stat.online)
        host_table_html += ' <span class="label label-danger">offline</span>';
      else {
        host_table_html += ' <span class="label label-success">online</span>';
        host_table_html += ' <a href="#" title="send" host="' + stat.host;
        host_table_html += '"><span class="glyphicon glyphicon-send pull-right"></span></a>';
      }
      host_table_html += '</td></tr>';
    }

    host_table_html += '</table></div>';
    /* End the row */
    card.find('.content').append(host_table_html);
    card.find('.content').append(util.gen_graph_card_6('Memstat per Node', 'Current', 'info', 'memory-chart'))
    $('#detail-view').append(card);

    /* Charts */
    var groups = [], columns = [];
    for (var key in databases.memstat) {
      groups.push(key);
      var column = databases.memstat[key];
      column.unshift(key);
      columns.push(column);
    }

    databases.mem_chart = c3.generate({
       bindto: '#memory-chart',
       padding: {
         right: 15
       },
       data: {
         columns: columns,
         type: 'bar',
         groups: [groups]
       },
       tooltip: {
         format: {
           value: function (value, ratio, id, index) {
             return util.size_to_human_readable(value);
           }
         }
       },
       axis: {
         x: {
           tick: {
             format: function(idx) {
               return databases.stats[idx].host;
             }
           }
         },
         y: {
           tick: {
             format: function(d) {
               return util.size_to_human_readable(d);
             }
           }
         }
       }
    });

    $('#myModal').on('show.bs.modal', function(e){
      databases.term = $('#websend').terminal(function(command) {
        var that = this;
        if (command === '')
          this.echo('');
        else {
          this.pause();
          $.ajax({
             url: 'websend',
             data: 'q=' + command +
                   '&database=' + databases.active_db +
                   '&host=' + databases.active_host
          }).fail(function(xhr){
            that.error(xhr.responseText);
            that.resume();
          }).done(function(data){
            for (var i = 0, len = data.a.length; i != len; ++i)
              that.echo(data.a[i]);
            that.resume();
          });
        }
      }, {
        greetings: '',
        name: 'WebSend',
        height: 650,
        prompt: databases.active_db +'@' + databases.active_host + '> '
      });
    }).on('hidden.bs.modal', function(e){
      databases.term.destroy();
    });

    $('#detail-view table a').click(function(e){
      databases.active_host = $(this).attr('host');
      $('#myModal').modal('show');
    });
  },

  gen_pg_hitrate: function(){
    var card = $(util.gen_card_12());
    card.find('.content').append(util.gen_graph_card_6('Page Reads/Writes per Node', 'Current', 'info', 'rdwr-chart'))
                         .append(util.gen_graph_card_6('Cache Hitrate per Node', 'Current', 'info', 'hr-chart'));
    $('#detail-view').append(card);

    /* Charts */
    var column1 = [], column2 = [];
    for (var i = 0, len = databases.stats.length; i != len; ++i) {
      column1.push(parseInt(databases.stats[i].pgrd));
      column2.push(parseInt(databases.stats[i].pgwr));
    }
    column1.unshift("Page Reads");
    column2.unshift("Page Writes");

    databases.rdwr_chart = c3.generate({
       bindto: '#rdwr-chart',
       padding: {
         right: 15
       },
       data: {
         columns: [column1, column2],
         type: 'bar'
       },
       axis: {
         x: {
           tick: {
             format: function(idx) {
               return databases.stats[idx].host;
             }
           }
         }
       }
    });

    var column = [];
    for (var i = 0, len = databases.stats.length; i != len; ++i) {
      column.push(parseInt(databases.stats[i].hitrate));
    }
    column.unshift("Hit Rate");

    databases.hr_chart = c3.generate({
       bindto: '#hr-chart',
       padding: {
         right: 15
       },
       data: {
         columns: [column],
         type: 'bar'
       },
       legend: {
         hide: true
       },
       tooltip: {
         format: {
           value: function (value, ratio, id, index) {
             return value + '%';
           }
         }
       },
       axis: {
         x: {
           tick: {
             format: function(idx) {
               return databases.stats[idx].host;
             }
           }
         },
         y: {
           label: {
             text: 'Hit Rate'
           }
         }
       }
    });
  },

  load_db: function(db) {
    databases.active_db = db;
    databases.stats = [];

    /* Only load the selected context. */
    var local_contexts = ($('#search_keyword').attr('t') == 2) ?
        $('#search_result_dropdown').val() : $('#search_keyword').attr('q');
    console.log('Loading ' + db + '(' + local_contexts + ')');
    
    $.ajax({
       url: 'get_database_details',
       data: 'q=' + db + '&ctxs=' + local_contexts
    }).fail(function(xhr){
      loading.stop();
      /* Always detach loading screen before wiping out the view. */
      databases.detached_rhino = $('#loading-screen-databases').detach();
      $('#detail-view').html($('<h3 style="text-align:center">' +
                               'The database is offline.</h3>'));
    }).done(function(data){
      /* Database perf */
      databases.perf = data.perf;

      /* Database size */
      databases.dbsize = data.size;

      /* Database stat - this needs a bit parsing work. */
      for (var i = 0, len = data.a.length; i != len; ++i) {
        var j, jlen;
        var host = data.a[i].host;
        console.log('Parsing ' + data.q + ' info from ' + host);
        var nsql = 0;
        var cachesize = 'Unknown';
        var pgrd = 0;
        var pgwr = 0;
        var hitrate = 0;
        var master = (data.a.master != 0);
        var mem = [];
    
        for (j = 0, jlen = data.a[i].stat.length, stat = data.a[i].stat; j != jlen; ++j) {
          if (stat[j].startsWith("num sql queries")) {
            var toks = stat[j].split(" ");
            nsql += parseInt(toks[toks.length - 1]);
          } else if (stat[j].startsWith("num new sql queries")) {
            var toks = stat[j].split(" ");
            nsql += parseInt(toks[toks.length - 1]);
          } else if (stat[j].startsWith("cachesize")) {
            cachesize = stat[j].substr("cachesize".length).trim();
          } else if (stat[j].startsWith("page reads")) {
            pgrd = parseInt(stat[j].substr("page reads".length).trim());
          } else if (stat[j].startsWith("page writes")) {
            pgwr = parseInt(stat[j].substr("page writes".length).trim());
          } else if (stat[j].startsWith("hit rate")) {
            hitrate = stat[j].substr("hit rate".length).trim();
          }
        }

        for (j = 0, jlen = data.a[i].memstat.length, stat = data.a[i].memstat; j != jlen; ++j) {
          var sa = stat[j].split('|');
          var module = sa[0].trim();
          if (module == 'name' || module == 'MemTrack' || module == 'total')
            continue;
          if (databases.memstat[module] == null)
            databases.memstat[module] = [];
          /* C3 weirdness... */
          if (module == "datetime")
            databases.memstat[module].push(parseInt(sa[1].trim()) + 1);
          else
            databases.memstat[module].push(parseInt(sa[1].trim()));
        }

        databases.stats.push({
          'host': host,
          'nsql': nsql,
          'cachesize': cachesize,
          'pgrd': pgrd,
          'pgwr': pgwr,
          'hitrate': parseFloat(hitrate),
          'master': master,
          'online': jlen > 0
        });
      }

      /* sort by hostname */
      databases.stats.sort(function(a, b) {
        if (a.host < b.host) return -1;
        if (a.host > b.host) return 1;
        return 0;
      });

      console.log('Done parsing.');
      databases.gen_db_ui();
    });
  },

  load_list: function(){
    loading.stop();
    $('#placeholder .submodule').hide();
    $('#placeholder').show();
    loading.start('#loading-screen-databases');
    
    /* Only load the selected databases */
    var local_databases = ($('#search_keyword').attr('t') == 1) ?
        $('#search_result_dropdown').val() : $('#search_keyword').attr('q');
    console.log('Databases are ' + local_databases);
    
    $.ajax({
      url: 'get_database_list',
      data: 'q=' + local_databases
    }).fail(function(xhr){
      alert(xhr.responseText);
    }).done(function(data){
      /* Just in case. */
      if (data.a.length == 0)
        return;
    
      console.log('Constructing data table.');
      $('#databases_tbody').html('');

      /* Sort by dbname */
      data.a.sort(function(a, b){
        if (a.database < b.database) return -1;
        if (a.database > b.database) return 1;
        return 0;
      });
    
      tbody = '';
      for (var i = 0, len = data.a.length; i != len; ++i) {
        var tr = '<tr db="' + data.a[i].database + '"';
        if (data.a[i].version == null || data.a[i].version.length == 0) {
          tr += ' offline="1" class="warning" style="cursor: pointer;"><th>' + data.a[i].database + '</th>';
          tr += '<td>Offline</td>'
        } else {
          tr += ' offline="0" style="cursor: pointer;"><th>' + data.a[i].database + '</th>';
          tr += '<td>' + data.a[i].version + '</td>';
        }
        tr += '</tr>';
        tbody += tr;
      }

      $('#databases_tbody').html(tbody);
      $('#databases_tbody tr').click(function(e){
        if ($(this).attr('pop') == 1)
          return;

        $('#databases_tbody tr').attr('pop', 0).removeClass('hovered');
        $(this).addClass('hovered');
        $(this).attr('pop', 1);

        databases.clean_slate();
        /* Always detach loading screen before wiping out the view. */
        databases.detached_rhino = $('#loading-screen-databases').detach();
        $('#detail-view').html('');

        if ($(this).attr('offline') == 1)
          $('#detail-view').append($('<h3 style="text-align:center">The database is offline.</h3>'));
        else {
          console.log('Loading ' + data.q + ' details');
          $('#detail-view').append(databases.detached_rhino);
          loading.stop();
          loading.start('#loading-screen-databases');
          databases.load_db($(this).attr('db'));
        }
      });
    
      $('#placeholder .submodule').show();
      $('#databases_tbody tr').first().click();
    });
  },

  gen_contexts: function(e){
    var card = $(util.gen_card_12());
    var ctx_html = '';
    ctx_html += '<h5 class="caption">Daily Requests per Context';

    ctx_html += '<div id="rpcrngs" class="btn-group btn-group-xs pull-right" role="group" aria-label="...">';
    ctx_html += '<button type="button" class="btn btn-default active" show="today">';
    ctx_html += 'Today';
    ctx_html += '</button>';
    ctx_html += '<button type="button" class="btn btn-default" show="7day">';
    ctx_html += '7-Day';
    ctx_html += '</button>';
    ctx_html += '<button type="button" class="btn btn-default" show="14day">';
    ctx_html += '14-Day';
    ctx_html += '</button>';
    ctx_html += '</div>';

    ctx_html += '<div id="rpcbtns" class="btn-group btn-group-xs pull-right" role="group" aria-label="...">';
    ctx_html += '<button type="button" class="btn btn-default active" show="line">';
    ctx_html += 'Line';
    ctx_html += '</button>';
    ctx_html += '<button type="button" class="btn btn-default" show="bar">';
    ctx_html += 'Bar';
    ctx_html += '</button>';
    ctx_html += '<button type="button" class="btn btn-default" show="stacked">';
    ctx_html += 'Stacked';
    ctx_html += '</button>';
    ctx_html += '</div> ';

    ctx_html += '</h5>';
    card.find('.content').append(ctx_html).append(util.gen_graph('reqctx-chart')).append('<hr/>');
    $('#detail-view').append(card);

    ctx_html = '';
    ctx_html += '<h5 class="caption">Request Rate per Context';

    ctx_html += '<div id="rrpcrngs" class="btn-group btn-group-xs pull-right" role="group" aria-label="...">';
    ctx_html += '<button type="button" class="btn btn-default active" show="today">';
    ctx_html += 'Today';
    ctx_html += '</button>';
    ctx_html += '<button type="button" class="btn btn-default" show="7day">';
    ctx_html += '7-Day';
    ctx_html += '</button>';
    ctx_html += '<button type="button" class="btn btn-default" show="14day">';
    ctx_html += '14-Day';
    ctx_html += '</button>';
    ctx_html += '</div>';

    ctx_html += '<div id="rrpcbtns" class="btn-group btn-group-xs pull-right" role="group" aria-label="...">';
    ctx_html += '<button type="button" class="btn btn-default active" show="step">';
    ctx_html += 'Step';
    ctx_html += '</button>';
    ctx_html += '<button type="button" class="btn btn-default" show="area-step">';
    ctx_html += 'Area Step';
    ctx_html += '</button>';
    ctx_html += '</div></h5>';
    card.find('.content').append(ctx_html).append(util.gen_graph('reqrctx-chart'));
    $('#detail-view').append(card);

    /* Charts */

    var curr = new Date();
    curr.setHours(0);
    curr.setMinutes(0);
    curr.setSeconds(0);
    curr.setMilliseconds(0);
    curr.setDate(curr.getDate() - 13);

    /* Construct my 2-d array */
    var columnmap = {};
    for (var key in databases.weeknctx) {
      if (columnmap[key] == null)
        columnmap[key] = [];
    }

    for (var key in databases.lastweeknctx) {
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
    for (var i = 0, len = databases.perf.length; i != len; ++i) {
      var ctx = databases.perf[i].context;
      var cnt = databases.perf[i].context_count;
      var stime = databases.perf[i].starttime;
      var etime = databases.perf[i].endtime;
      var rate = 60 * cnt / (etime - stime);

      /* look up the value in `dates' array so we know the position to add the count to. */
      var j = 13;
      for (; j >= 0; --j)
        if (stime >= dates[j])
          break;

      if (j >= 0)
        columnmap[ctx][j] += cnt;

      xvals[ctx].push(stime);
      rowvals[ctx].push(rate);
    }

    /* Transform to what C3 wants */

    dates.unshift('x');
    var columns = [dates];
    for (var key in columnmap) {
      columnmap[key].unshift(key);
      columns.push(columnmap[key]);
    }

    databases.reqctx_chart = c3.generate({
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

    databases.reqrctx_chart = c3.generate({
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
    $('#rpcbtns button').click(function(){
      $('#rpcbtns button').removeClass('active');
      $(this).addClass('active');
      if ($(this).attr('show') != 'stacked') {
        databases.reqctx_chart.transform($(this).attr('show'));
        databases.reqctx_chart.groups([]);
      } else {
        databases.reqctx_chart.transform('bar');
        databases.reqctx_chart.groups([grouparr]);
      }
    });

    $('#rrpcbtns button').click(function(){
      $('#rrpcbtns button').removeClass('active');
      $(this).addClass('active');
      databases.reqrctx_chart.transform($(this).attr('show'));
    });

    /* Chart ranges */

    $('#rpcrngs button').click(function(){
      $('#rpcrngs button').removeClass('active');
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
      databases.reqctx_chart.zoom([start, end]);
    });

    $('#rpcrngs button.active').click();

    $('#rrpcrngs button').click(function(){
      $('#rrpcrngs button').removeClass('active');
      $(this).addClass('active');
      var show = $(this).attr('show');

      /* Create a new date everytime. Don't want to mess 
         with javascript's weird variable scope. */
      var currd = new Date();
      var end = currd.getTime() / 1000, start;
      var ealiest = databases.perf[0].starttime;
      var latest = databases.perf[databases.perf.length - 1].starttime;

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
      databases.reqrctx_chart.zoom([start > ealiest ? start : ealiest, end < latest ? end : latest]);
    });

    $('#rrpcrngs button.active').click();
  }
};

databases.load_list();
