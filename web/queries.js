queries = {
  detached_rhino: null,

  clean_slate: function(){
  },

  load_list: function(){
    /* Show loading animation. */
    loading.stop();
    $('#placeholder .submodule').hide();
    loading.start('#loading-screen-queries');

    var local_databases, local_ctxs;
    if ($('#search_keyword').attr('t') == 1) {
      local_databases = $('#search_result_dropdown').val();
      local_ctxs = $('#search_keyword').attr('q');
    } else {
      local_databases = $('#search_keyword').attr('q');
      local_ctxs = $('#search_result_dropdown').val();
    }

    console.log('Loading queries (ctx=' + local_ctxs + ', db=' + local_databases + ')');

    $('#query-list').DataTable({
      processing: true,
      serverSide: true,
      //scrollX: true,
      ajax: {
        url: 'get_query_list?dbs=' + local_databases + '&ctxs=' + local_ctxs,
        dataSrc: function(data){
          var rv = [];
          if (data.recordsFiltered == null)
            data.recordsFiltered = data.recordsTotal;

          for (var i = 0; i != data.raw.length; ++i) {
            var rawdata = data.raw[i];
            rv.push([
              '',
              rawdata.sql.length > 30 ? rawdata.sql.substr(0, 27) + '...' : rawdata.sql,
              rawdata.count,

              rawdata.minrtm,
              (rawdata.totrtm / rawdata.count).toFixed(2),
              rawdata.maxrtm,


              rawdata.mincost,
              (rawdata.totcost / rawdata.count).toFixed(2),
              rawdata.maxcost,

              rawdata.minrows,
              (rawdata.totrows / rawdata.count).toFixed(2),
              rawdata.maxrows,

              rawdata.minlkws,
              (rawdata.totlkws / rawdata.count).toFixed(2),
              rawdata.maxlkws,

              rawdata.minlkwtm,
              (rawdata.totlkwtm / rawdata.count).toFixed(2),
              rawdata.maxlkwtm,

              rawdata.minrds,
              (rawdata.totrds / rawdata.count).toFixed(2),
              rawdata.maxrds,

              rawdata.minrdtm,
              (rawdata.totrdtm / rawdata.count).toFixed(2),
              rawdata.maxrdtm,

              rawdata.minwrs,
              (rawdata.totwrs / rawdata.count).toFixed(2),
              rawdata.maxwrs,

              rawdata.minwrtm,
              (rawdata.totwrtm / rawdata.count).toFixed(2),
              rawdata.maxwrtm,

              new Date(rawdata.firstseentime * 1000).toISOString().substring(0, 19)
            ]);
          }
          return rv;
        },
        data: function(data){
          if (data.search.value != null && data.search.value != '')
            data.q = '%' + data.search.value + '%';
        }
      },
      columnDefs: [
        {
          orderable: false,
          className: 'select-checkbox',
          searchable: false,
          targets: 0
        },
        {
          searchable: false,
          targets: 2
        },
        {
          searchable: false,
          targets: 3
        },
        {
          searchable: false,
          targets: 4
        },
        {
          searchable: false,
          targets: 5
        }
      ],
      select: {
        style: 'os',
        selector: 'td:first-child'
      },
      order: [[1, 'asc']]
    });

    loading.stop();
    $('#placeholder .submodule').show();
  }
}

queries.load_list();
