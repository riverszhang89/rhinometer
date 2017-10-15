var databases = {
  detached_rhino: null,
  active_host: null,
  active_db: null,
  term: null,
  stats: [],
  memstat: {},
  gen_db_ui: function(){
    if (databases.stats.length == 0) {
      alert('Did not receive any data from server.');
      return;
    }
    /* The detail view now owns the loading screen.
       Don't destroy it. */
    console.log('Generating screen.');
    loading.stop();
    databases.gen_badges();
    databases.gen_host_table();
    databases.gen_memory();
    databases.gen_pg_hitrate();
    console.log('Screen generated.');
  },
  gen_hr: function(){
    $('#detail-view').append($('<div class="row col-md-12"><hr/></div>'));
  },
  gen_badges: function(){
    var badges_html = '<div class="col-md-12 row">';

    var tothitrate = 0,
        totpgrd = 0,
        totpgwr = 0,
        totnsql = 0,
        len, i;

    for (i = 0, len = databases.stats.length; i != len; ++i) {
      var stat = databases.stats[i];
      if (!stat.online)
          continue;
      tothitrate += stat.hitrate;
      totpgrd += stat.pgrd;
      totpgwr += stat.pgwr;
      totnsql += stat.nsql;
    }

    /* # SQL card */
    badges_html += '<div class="col-md-3 well-dbcard">';
    badges_html += '<div class="well well-sm"><h5 class="caption">SQL Requests';
    badges_html += '<span class="label label-warning pull-right">Total</span></h5>';
    badges_html += '<h3 class="content">' + totnsql;
    badges_html += '</h3></div></div>';

    /* Page rd/wr card */
    badges_html += '<div class="col-md-3 well-dbcard">';
    badges_html += '<div class="well well-sm"><h5 class="caption">Page Reads/Writes';
    badges_html += '<span class="label label-warning pull-right">Total</span></h5>';
    badges_html += '<h3 class="content">' + totpgrd + ' / ' + totpgwr;
    badges_html += '</h3></div></div>';

    /* Cache size card */
    badges_html += '<div class="col-md-3 well-dbcard">';
    badges_html += '<div class="well well-sm"><h5 class="caption">Cache Size</h5>';
    badges_html += '<h3 class="content">' + databases.stats[0].cachesize;
    badges_html += '</h3></div></div>';

    /* Cache hitrate card */
    badges_html += '<div class="col-md-3 well-dbcard">';
    badges_html += '<div class="well well-sm"><h5 class="caption">Cache Hit Rate';
    badges_html += '<span class="label label-info pull-right">Average</span></h5>';
    badges_html += '<h3 class="content">' + (tothitrate / len).toFixed(2) + '%';
    badges_html += '</h3></div></div>';

    badges_html += '</div>';
    $('#detail-view').append($(badges_html));
  },

  gen_host_table: function() {
    /* Table */
    var host_table_html = '<div class="col-md-12 row">';
    host_table_html += '<div class="col-md-12 well-dbcard">';
    host_table_html += '<div class="well well-sm">';
    host_table_html += '<div class="content row">';
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
      host_table_html += '</td>';
    }

    host_table_html += '</table></div>';

    host_table_html += '<div class="col-md-6 clear-padl">';
    host_table_html += '<h5 class="caption">SQL Requests</h5>';
    host_table_html += '<div id="nsql-chart"></div></div>';

    /* End the row */
    host_table_html += '</div></div></div>';
    $('#detail-view').append($(host_table_html));

    /* Charts */
    var column = [];
    for (var i = 0, len = databases.stats.length; i != len; ++i) {
      column.push(parseInt(databases.stats[i].nsql));
    }

    column.unshift("# SQL");

    var chart = c3.generate({
       bindto: '#nsql-chart',
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
             text: 'Number of SQL Requests'
           }
         }
       }
    });

    /* Events */
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
    var pghr_html = '<div class="col-md-12 row">';
    pghr_html += '<div class="col-md-12 well-dbcard">';
    pghr_html += '<div class="well well-sm">';
    pghr_html += '<div class="content row">';
    pghr_html += '<div class="col-md-6 clear-padl">';
    pghr_html += '<h5 class="caption">Page Reads/Writes</h5>';
    pghr_html += '<div id="rdwr-chart"></div></div>';
    pghr_html += '<div class="col-md-6 clear-padl">';
    pghr_html += '<h5 class="caption">Cache Hit Rate</h5>';
    pghr_html += '<div id="hr-chart"></div></div>';
    pghr_html += '</div></div></div></div>';
    $('#detail-view').append($(pghr_html));

    /* Charts */
    var column1 = [], column2 = [];
    for (var i = 0, len = databases.stats.length; i != len; ++i) {
      column1.push(parseInt(databases.stats[i].pgrd));
      column2.push(parseInt(databases.stats[i].pgwr));
    }
    column1.unshift("Page Reads");
    column2.unshift("Page Writes");

    var chart = c3.generate({
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

    var chart = c3.generate({
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

  gen_memory: function(){
    var mem_html = '<div class="col-md-12 row">';
    mem_html += '<div class="col-md-12 well-dbcard">';
    mem_html += '<div class="well well-sm"><h5 class="caption">Memstat</h5>';
    mem_html += '<div id="memory-chart"></div>';
    mem_html += '</div></div></div>';
    $('#detail-view').append($(mem_html));

    /* Charts */
    var groups = [], columns = [];
    for (var key in databases.memstat) {
      groups.push(key);
      var column = databases.memstat[key].slice(0);
      column.unshift(key);
      columns.push(column);
    }

    var chart = c3.generate({
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
  },

  load_db: function(db) {
    databases.active_db = db;
    databases.stats = [];
    $.ajax({
       url: 'get_database_details',
       data: 'q=' + db
    }).fail(function(xhr){
      loading.stop();
    }).done(function(data){
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
        return a.host - b.host;
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
    
    var local_databases = (actual_search_type == 1) ? $('#search_result_dropdown').val() : $('#search_keyword').attr('q');
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
        return a.database - b.database;
      });
    
      tbody = '';
      for (var i = 0, len = data.a.length; i != len; ++i) {
        var tr = '<tr db="' + data.a[i].database + '"';
        if (data.a[i].version == null || data.a[i].version.length == 0) {
          tr += ' offline="1" class="warning" style="cursor: pointer;"><th>' + data.a[i].database + '</th>';
          tr += '<td colspan="2">Offline</td>'
        } else {
          tr += ' offline="0" style="cursor: pointer;"><th>' + data.a[i].database + '</th>';
          tr += '<td>' + util.size_to_human_readable(data.a[i].size) + '</td>';
          tr += '<td>' + data.a[i].version + '</td>';
        }
        tr += '</tr>';
        tbody += tr;
      }

      $('#databases_tbody').html(tbody);
      $('#databases_tbody tr').click(function(e){
        if ($(this).attr('pop') == 1)
          return false;

        $('#databases_tbody tr').attr('pop', 0).removeClass('hovered');
        $(this).addClass('hovered');
        $(this).attr('pop', 1);

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
  }
};

databases.load_list();
