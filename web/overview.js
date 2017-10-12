loading.stop();
$('#placeholder .submodule').hide();
$('#placeholder').show();
loading.start('#loading-screen-overview');

if (search_type_text == 'Context') {
} else {
  console.log('Databases are ' + $('#search_keyword').val());
}
$.ajax({
});
