/* ================= HELPER ================ */
var loading = {
    helper: true,
    timer: null,
    prev: null,
    start: function(id){
      loading.prev = $(id);
      $(id).show();
      $(id + ' .rhino-0').hide();
      loading.helper = true;
      loading.timer = setInterval(function(){
        if (loading.helper) {
          $(id + ' .rhino-1').hide();
          $(id + ' .rhino-2').show();
        } else {
          $(id + ' .rhino-1').show();
          $(id + ' .rhino-2').hide();
        }
        loading.helper = !loading.helper;
      }, 200);
    },
    stop: function(id){
      if (loading.timer == null)
        return;
      clearInterval(loading.timer);
      loading.prev.hide();
      loading.timer = null;
    }
};

/* ================= SEARCH BAR ================ */
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
  $('#search_result_dropdown').removeClass('btn-danger').html('').append('<option selected="selected">Loading...</option>').multiselect({
    inheritClass: true,
    enableFiltering: true,
    includeSelectAllOption: true,
    onDropdownHidden: function(e){
      $('#tabs>li.active>a').click();
    }
  });

  $.ajax({
      url: search_type_text == 'Context' ? 'get_databases_by_context' : 'get_contexts_by_database',
      data: 'q=' + search_keyword
    }).done(function(data){
      if (data.a.length == 0 ) {
        $('#search_result_dropdown').multiselect('destroy');
        $('#search_result_dropdown').html('').append('<option selected="selected">No records found</option>').addClass('btn-danger').multiselect({
          inheritClass: true
        });
        console.log('Get back nothing.');
      } else {
        var ctrl = $('#search_result_dropdown').html('');
        for (var i = 0, len = data.a.length; i != len; ++i) {
          var htmnode = '<option values="' + data.a[i] + '">' + data.a[i] + '</option>';
          ctrl.append(htmnode).multiselect('rebuild');
        }
        $('#search_result_dropdown').parent().find('div > button').click();
        console.log('Get back ' + data.a.length + ' element(s).');
      }
      $('#search_keyword').attr('q', data.q);
    }).fail(function(xhr){
      alert(xhr.responseText);
      $('#search_result_dropdown').multiselect('destroy');
      $('#search_result_dropdown').html('').append('<option selected="selected">Failed to load data</option>').addClass('btn-danger').multiselect({
        inheritClass: true
      });
      console.log('Backend not responding.');
    });
  return false;
});

$('#search_result_dropdown').multiselect({
  inheritClass: true
});

/* Adjust the position of placeholder */
$('#placeholder').css('margin-top', $('#tabs').height() + 10 + 'px');

/* ================= TABS ================ */
var submodule;
$('#tabs>li>a').click(function(e){
  /* Can't proceed if no keyword. */
  if ($('#search_keyword').val() == '') {
    alert('Enter a keyword to begin.');
    $('#search_keyword').focus();
    return false;
  }

  /* Can't proceed either if no records selected. */
  if ($('#search_result_dropdown').val() == null || $('#search_result_dropdown').val().length == 0) {
    alert('Select ' + ((search_type_text == 'Context') ? 'databases' : 'contexts') + ' to proceed.');
    $('#search_result_dropdown').parent().find('div>button').click();
    return false;
  }

  $('#placeholder').html('');
  loading.stop();
  submodule = $(this).text().toLowerCase();
  console.log('User clicks ' + submodule);
  $('#tabs>li').removeClass('active');
  $(this).parent().addClass('active');
  console.log('Loading ' + submodule + '.html');

  loading.start('#loading-screen');
  $.ajax(submodule + '.html').fail(function(xhr){
    alert(xhr.responseText);
  }).done(function(data){
    console.log('Successfully loaded.');
    if ($('#tabs>li.active').text().toLowerCase() == submodule) {
      loading.stop();
      $('#placeholder').html(data);
    }
  });
  return false;
});
