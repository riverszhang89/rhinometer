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
      scrollX: true,
      ajax: {
        url: 'get_query_list?dbs=' + local_databases + '&ctxs=' + local_ctxs,
        dataSrc: function(data){
          /* Preprocess data. return an array of rows. */
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
              rawdata.avgrtm.toFixed(2),
              rawdata.maxrtm,


              rawdata.mincost,
              rawdata.avgcost.toFixed(2),
              rawdata.maxcost,

              rawdata.minrows,
              rawdata.avgrows.toFixed(2),
              rawdata.maxrows,

              rawdata.minlkws,
              rawdata.avglkws.toFixed(2),
              rawdata.maxlkws,

              rawdata.minlkwtm,
              rawdata.avglkwtm.toFixed(2),
              rawdata.maxlkwtm,

              rawdata.minrds,
              rawdata.avgrds.toFixed(2),
              rawdata.maxrds,

              rawdata.minrdtm,
              rawdata.avgrdtm.toFixed(2),
              rawdata.maxrdtm,

              rawdata.minwrs,
              rawdata.avgwrs.toFixed(2),
              rawdata.maxwrs,

              rawdata.minwrtm,
              rawdata.avgwrtm.toFixed(2),
              rawdata.maxwrtm,

              new Date(rawdata.firstseentime * 1000).toISOString().substring(0, 19)
            ]);
          }
          return rv;
        },
        data: function(data){
          if (data.search.value != null && data.search.value != '')
            data.q = '%' + data.search.value + '%';
          /* We don't need them. In fact sending them to server sometimes
             causes server to run out of memory :( */
          data.columns = null;
          data.order = JSON.stringify(data.order);
        }
      },
      columnDefs: [
        {
          orderable: false,
          className: 'select-checkbox',
          searchable: false,
          targets: 0
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
