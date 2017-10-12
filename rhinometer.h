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
#include <cson_amalgamation_core.h>

/* We have not yet decided how to deploy the program.
   Make it a macro so we can easily change it in the future. */
#define CDB2_OPEN(h) cdb2_open(h, "comdb2perfdb", "localhost", CDB2_DIRECT_CPU)
#define CDB2_OPEN_DB(h, db) cdb2_open(h, db, "localhost", CDB2_DIRECT_CPU)

typedef cson_value *(*do_request)(struct MHD_Connection *, char *, size_t);

cson_value *get_databases_by_context(struct MHD_Connection *, char *, size_t);
cson_value *get_contexts_by_database(struct MHD_Connection *, char *, size_t);
cson_value *get_database_list(struct MHD_Connection *, char *, size_t);
cson_value *get_database_details(struct MHD_Connection *, char *, size_t);
