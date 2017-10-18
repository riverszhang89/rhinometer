#include <rhinometer.h>

#ifndef PORT
# define PORT 80
#endif

const char *e400 = "400 Bad Request";
const char *e404 = "404 Not Found";
const char *e500 = "500 Internal error";


static struct MHD_Response *
serve_dynamic_requests(do_request fn, struct MHD_Connection *conn,
                       char* error, size_t sz)
{
    cson_value *root = fn(conn, error, sz);
    cson_buffer buf = cson_buffer_empty;
    struct MHD_Response *resp;

    if (root == NULL)
        return NULL;

    cson_output_buffer(root, &buf, NULL);
    resp = MHD_create_response_from_buffer(buf.used, (void *)buf.mem, MHD_RESPMEM_MUST_COPY);
    if (resp != NULL)
        MHD_add_response_header(resp, "Content-Type", "application/json");
    cson_buffer_reserve(&buf, 0);
    cson_value_free(root);
    return resp;
}

static struct MHD_Response *
serve_static_requests(struct MHD_Connection *conn, const char *fn, const char *mime)
{
    int fd;
    struct stat sbuf;
    char staticres[PATH_MAX];
    struct MHD_Response *resp;

    snprintf(staticres, sizeof(staticres), "%s/%s", "web", fn);

    if ((fd = open(staticres, O_RDONLY)) == -1)
        return NULL;

    if (fstat(fd, &sbuf) != 0) {
        close(fd);
        return NULL;
    }

    resp = MHD_create_response_from_fd(sbuf.st_size, fd);
    if (resp != NULL)
        MHD_add_response_header(resp, "Content-Type", mime);
    return resp;
}

static int answer_to_connection(void *cls, struct MHD_Connection *connection,
                                const char *url, const char *method,
                                const char *version, const char *upload_data,
                                size_t *upload_data_size, void **con_cls)
{
    struct MHD_Response *response;
    int ret = 404, rc = 0;
    const char *datasource = &url[1];
    char error[1024], errortoclnt[1068];

    error[0] = '\0';

    printf("URL %s\n", url);

    /* Serve request */

    /* =================== INDEX PAGE =================== */
    if (url[strlen(url) - 1] == '/') {
        response = serve_static_requests(connection, "index.html", "text/html");
        ret = (response == NULL) ? 404 : 200;
    /* =================== DYNAMIC =================== */
    /* =================== MISC =================== */
    } else if (strcmp(datasource, "get_databases_by_context") == 0) {
        response = serve_dynamic_requests(get_databases_by_context, connection, error, sizeof(error));
        ret = (response == NULL) ? 500 : 200;
    } else if (strcmp(datasource, "get_contexts_by_database") == 0) {
        response = serve_dynamic_requests(get_contexts_by_database, connection, error, sizeof(error));
        ret = (response == NULL) ? 500 : 200;
    /* =================== DATABASES =================== */
    } else if (strcmp(datasource, "get_database_list") == 0) {
        response = serve_dynamic_requests(get_database_list, connection, error, sizeof(error));
        ret = (response == NULL) ? 500 : 200;
    } else if (strcmp(datasource, "get_database_details") == 0) {
        response = serve_dynamic_requests(get_database_details, connection, error, sizeof(error));
        ret = (response == NULL) ? 500 : 200;
    } else if (strcmp(datasource, "websend") == 0) {
        response = serve_dynamic_requests(websend, connection, error, sizeof(error));
        ret = (response == NULL) ? 500 : 200;
    /* =================== STATIC =================== */
    } else if (strlen(datasource) > 3 && strcasecmp(&datasource[strlen(datasource) - 3], ".js") == 0) {
        response = serve_static_requests(connection, datasource, "application/javascript");
        ret = (response == NULL) ? 404 : 200;
    } else if (strlen(datasource) > 4 && strcasecmp(&datasource[strlen(datasource) - 4], ".css") == 0) {
        response = serve_static_requests(connection, datasource, "text/css");
        ret = (response == NULL) ? 404 : 200;
    } else if (strlen(datasource) > 5 && strcasecmp(&datasource[strlen(datasource) - 5], ".html") == 0) {
        response = serve_static_requests(connection, datasource, "text/html");
        ret = (response == NULL) ? 404 : 200;
    } else {
        response = serve_static_requests(connection, datasource, "text/plain");
        ret = (response == NULL) ? 404 : 200;
    }

    /* Generate response */
    if (ret == 200) {
        rc = MHD_queue_response(connection, MHD_HTTP_OK, response);
    } else {
        fprintf(stderr, "! Backend error: %s\n", error);
        if (ret == 400)
            snprintf(errortoclnt, sizeof(errortoclnt), "%s: %s", e400, error);
        else if (ret == 404)
            snprintf(errortoclnt, sizeof(errortoclnt), "%s: %s", e404, url);
        else
            snprintf(errortoclnt, sizeof(errortoclnt), "%s: %s", e500, error);

        response = MHD_create_response_from_buffer(strlen(errortoclnt), (void *)errortoclnt, MHD_RESPMEM_MUST_COPY);
        rc = MHD_queue_response(connection, ret, response);
    }

    MHD_destroy_response(response);
    return rc;
}

static void catcher (int _) {}

static void ignore_sigpipe ()
{
    struct sigaction oldsig;
    struct sigaction sig;

    sig.sa_handler = &catcher;
    sigemptyset(&sig.sa_mask);
#ifdef SA_INTERRUPT
    sig.sa_flags = SA_INTERRUPT;
#else
    sig.sa_flags = SA_RESTART;
#endif
    if (0 != sigaction(SIGPIPE, &sig, &oldsig))
        fprintf(stderr,
                "Failed to install SIGPIPE handler: %s\n", strerror (errno));
}

int main ()
{
    struct MHD_Daemon *daemon;
    char cmd;

    ignore_sigpipe();

    daemon = MHD_start_daemon(MHD_USE_SELECT_INTERNALLY | MHD_USE_DEBUG | MHD_USE_EPOLL_LINUX_ONLY, PORT, NULL, NULL,
            &answer_to_connection, NULL, MHD_OPTION_END);
    if (daemon == NULL)
        return 1;


    while (1) {
        cmd = getchar();
        if (cmd == 'q')
            break;
    }

    MHD_stop_daemon(daemon);
    return 0;
}
