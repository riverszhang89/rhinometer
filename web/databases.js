var databases = {
  detail: function(db){
    console.log('Loading database info of ' + db);
    $.ajax({
      url: 'get_database_details',
      data: 'q=' + db
    }).fail(function(xhr){
      alert(xhr.responseText);
    }).done(function(data){
      for (var i = 0, len = data.a.length; i != len; ++i) {
        var host = data.a[i].host;
        console.log('Parsing ' + data.q + ' info from ' + host);
        var nsql = 0;
        var cachesize = 'Unknown';
        var pgrd = 0;
        var pgwr = 0;
        var hitrate = 'N.A.';
    
        for (var j = 0, jlen = data.a[i].stat.length, stat = data.a[i].stat; j != jlen; ++j) {
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
      }
    });
  },
  load: function(){
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
    
      tbody = '';
      for (var i = 0, len = data.a.length; i != len; ++i) {
        var tr = '<tr db="' + data.a[i].database + '"';
        if (data.a[i].version == null || data.a[i].version.length == 0) {
          tr += ' offline="1" class="warning" style="cursor: pointer;"><th>' + data.a[i].database + '</th>';
          tr += '<td>Offline</td>'
        } else {
          tr += ' style="cursor: pointer;"><td>' + data.a[i].database + '</td>';
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
          animation: false,
          html: true,
          title: "Details",
          trigger: 'manual',
          content: ($(this).attr('offline') == 1) ?
                   '<h3 style="text-align:center">The database is offline.</h3>' :
                   databases.detail($(this).attr('db')),
          template: '<div id="database_details" class="popover col-md-12" role="tooltip" '
                    + 'style="max-width: none; min-height: 120px; width: 200%">'
                    + '<div class="arrow"></div>'
                    + '<h3 class="popover-title"></h3>'
                    + '<div class="popover-content"></div>'
                    + '</div>'
        }).popover('show');

        $(this).attr('pop', 1);
      });
    
      loading.stop();

      $('#placeholder .submodule').show();
      $('#databases_tbody tr').first().click();
    });
  }
};

databases.load();
