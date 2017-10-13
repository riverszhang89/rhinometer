var databases = {
  active_host: null,
  active_db: null,
  term: null,
  stats: [],
  gen_db_ui: function(){
    if (databases.stats.length == 0) {
      alert('Did not receive any data from server.');
      return;
    }
    /* The popover now owns the loading screen.
       Don't destroy it. */
    loading.stop();
    databases.gen_badges();
    databases.gen_hr();
    databases.gen_host_table();
  },
  gen_hr: function(){
    $('#db-popover').append($('<div class="col-md-12"><hr/></div>'));
  },
  gen_badges: function(){
    var badges_html = '<div class="col-md-12">';
    badges_html += '<h4><span class="btn btn-info"> # Nodes ';
    badges_html += '<span class="badge">' + databases.stats.length;
    badges_html += '</span></span> ';
    badges_html += '<span class="btn btn-info"> Cache Size ';
    badges_html += '<span class="badge">' + databases.stats[0].cachesize;
    badges_html += '</span></span> ';

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

    badges_html += '<span class="btn btn-info"> # SQL Requests ';
    badges_html += '<span class="badge">' + totnsql;
    badges_html += '</span></span> ';
    badges_html += '<span class="btn btn-info"> Page Reads ';
    badges_html += '<span class="badge">' + totpgrd;
    badges_html += '</span></span> ';
    badges_html += '<span class="btn btn-info"> Page Writes ';
    badges_html += '<span class="badge">' + totpgwr;
    badges_html += '</span></span> ';
    badges_html += '<span class="btn btn-info"> Cache Hit Rate ';
    badges_html += '<span class="badge">' + (tothitrate / len).toFixed(2) + '%';
    badges_html += '</span></span> ';

    badges_html += '</h4>';
    $('#db-popover').append($(badges_html));
  },
  gen_host_table: function() {
    var host_table_html = '<div class="col-md-6">' +
        '<table class="table table-striped">' +
        '<thead><tr><th>Nodes</th></tr></thead>' +
        '<tbody>';

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

    host_table_html += '</tbody></table></div>';

    $('#db-popover').append($(host_table_html));

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

    $('#db-popover tbody a').click(function(e){
      databases.active_host = $(this).attr('host');
      $('#myModal').modal('show');
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
    
    var local_databases = (search_type_text == 'Context') ? $('#search_result_dropdown').val() : $('#search_keyword').attr('q');
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
          tr += ' offline="0" style="cursor: pointer;"><td>' + data.a[i].database + '</td>';
          tr += '<td>' + util.size_to_human_readable(data.a[i].size) + '</td>';
          tr += '<td>' + data.a[i].version + '</td>';
        }
        tr += '</tr>';
        tbody += tr;
      }
      $('#databases_tbody').html(tbody);
    
      /* Binding popover. */
      $('#databases_tbody tr').click(function(e){
        if ($(this).attr('pop') == 1)
          return false;

        $('#databases_tbody tr').popover('destroy');
        $('#databases_tbody tr').attr('pop', 0);
        $(this).popover({
          container: $('#popover-container'),
          viewport: $('.submodule'),
          animation: false,
          html: true,
          title: "Details",
          trigger: 'manual',
          content: ($(this).attr('offline') == 1) ?
                   '<h3 style="text-align:center">The database is offline.</h3>' :
                   $('#loading-screen-databases').detach(),
          template: '<div class="popover col-md-12 dbpopover" role="tooltip">'
                    + '<div class="arrow"></div>'
                    + '<h3 class="popover-title"></h3>'
                    + '<div class="popover-content" id="db-popover"></div>'
                    + '</div>'
        });
        if ($(this).attr('offline') == '0') {
          $(this).on('inserted.bs.popover', function(){
            /* We don't need that much padding. */
            console.log('Loading ' + data.q + ' details');
            $('#loading-screen-databases .pre-rhino pre').css('padding-top', '0px');
            loading.stop();
            loading.start('#loading-screen-databases');
            databases.load_db($(this).attr('db'));
          });
        }
        $(this).popover('show').attr('pop', 1);
      });
    
      loading.stop();

      $('#placeholder .submodule').show();
      $('#databases_tbody tr').first().click();
    });
  }
};

databases.load_list();
