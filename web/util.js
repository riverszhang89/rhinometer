util = {
  size_to_human_readable: function(sz) {
    var isz = parseInt(sz);
    if (isz < 1024)
      return isz + ' B';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' KiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' MiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' GiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' TiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' PiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' EiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' ZiB';
    if ((isz /= 1024) < 1024)
      return isz.toFixed(2) + ' YiB';

    return '42';
  }
};
