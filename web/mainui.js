var search_type_text = 'Context';

$('#search_type_control>li>a').click(function(){
  /* User changes search type. */
  search_type_text = $(this).text();
  console.log('User changes search type to ' + search_type_text);
  $('#search_type_text').html(search_type_text);
  $('#search_keyword').attr('placeholder', 'Enter ' + search_type_text.toLocaleLowerCase() + " name here");
});

$('#search_keyword_form').submit(function(){
  /* User searches keyword. */
  var search_keyword = $('#search_keyword').val();
  console.log('User searches ' + search_type_text + ' ' + search_keyword);

  $('#search_result_dropdown').multiselect('destroy');
  $('#search_result_dropdown').removeClass('btn-danger').empty().append('<option selected="selected">Loading...</option>').multiselect({
    inheritClass: true,
    enableFiltering: true,
    includeSelectAllOption: true,
    onDropdownHide: function(e){
      $('#rhino-0').hide();
      var cnt = true;
      setInterval(function(){
        if (cnt) {
          $('#rhino-1').hide();
          $('#rhino-2').show();
        } else {
          $('#rhino-1').show();
          $('#rhino-2').hide();
        }
        cnt = !cnt;
      }, 200);
    }
  });

  $.ajax({
      url: search_type_text == 'Context' ? 'get_databases_by_context' : 'get_contexts_by_database',
      data: 'q=' + search_keyword
    }).done(function(data){
      if (data.list.length == 0 ) {
        $('#search_result_dropdown').multiselect('destroy');
        $('#search_result_dropdown').empty().append('<option selected="selected">No records found</option>').addClass('btn-danger').multiselect({
          inheritClass: true
        });
        console.log('Get back nothing.');
      } else {
        var ctrl = $('#search_result_dropdown').empty();
        for (var i = 0, len = data.list.length; i != len; ++i) {
          var htmnode = '<option values="' + data.list[i] + '">' + data.list[i] + '</option>';
          ctrl.append(htmnode).multiselect('rebuild');
        }
        $('#search_result_dropdown').parent().find('div > button').click();
        console.log('Get back ' + data.list.length + ' element(s).');
      }
    }).fail(function(xhr){
      alert(xhr.responseText);
      $('#search_result_dropdown').multiselect('destroy');
      $('#search_result_dropdown').empty().append('<option selected="selected">Failed to load data</option>').addClass('btn-danger').multiselect({
        inheritClass: true
      });
      console.log('Backend not responding.');
    });
  return false;
});

$('#search_result_dropdown').multiselect({
  inheritClass: true
});
