#include <errno.h>
#include <limits.h>
#include <signal.h>
#include <sys/types.h>
#include <sys/select.h>
#include <sys/socket.h>
#include <string.h>
#include <strings.h>
#include <unistd.h>
#include <microhttpd.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <stdio.h>
#include <cdb2api.h>

#include "cson_amalgamation_core.h"

typedef cson_value *(*do_request)(struct MHD_Connection *, char *, size_t);

cson_value *get_databases_by_context(struct MHD_Connection *, char *, size_t);
cson_value *get_contexts_by_database(struct MHD_Connection *, char *, size_t);
