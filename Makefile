INCS=-I/opt/bb/include -I. -Icson
LIBS=-lmicrohttpd /opt/bb/lib/libcdb2api.a -lprotobuf-c -lssl -lcrypto -lpthread
OBJS=rhinometer.o cson/cson_amalgamation_core.o \
     misc/get_databases_by_context.o misc/get_contexts_by_database.o \
     databases/get_database_list.o databases/get_database_details.o databases/websend.o \
     contexts/get_context_details.o \
     queries/get_query_list.o queries/get_query_rate.o
CFLAGS=-Wall -g $(INCS)
rhinometer: $(OBJS)
	g++ -o $@ $^ $(CFLAGS) $(LIBS)
