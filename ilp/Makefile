main: main.c cJSON.c solver.c
	gcc -o main main.c solver.c cJSON.c -lglpk -lm

wasm: main.c cJSON.c solver.c
	emcc -o main.js \
    main.c solver.c cJSON.c \
    -I/home/gerard/Desktop/glpk/glpk-5.0/src \
    -L/home/gerard/Desktop/glpk/glpk-5.0/src/.libs \
    -lglpk \
    -lm 	\
		--preload-file src/titles.json \
		--preload-file src/pubs.json \
		-sEXPORTED_FUNCTIONS=_init_solver,_delete_solver,_solve,_malloc,_free -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,HEAP32,HEAP64 \
		-sMODULARIZE=1 -sEXPORT_ES6=1 -sALLOW_MEMORY_GROWTH
	mv main.js main.data main.wasm ../website/optimal-asimov

