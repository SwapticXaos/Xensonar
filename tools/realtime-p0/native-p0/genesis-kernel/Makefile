# Plain make build. Mirrors CMakeLists.txt exactly and is what was actually
# used to produce EVIDENCE.md (the authoring sandbox has no cmake).
#
#   make            build library, tools and tests
#   make test       run the full suite and print the report
#   make PIPEWIRE=1 additionally build the PipeWire backend + host
#
# -ffp-contract=off keeps the compiler from fusing multiply-adds, which is what
# makes the bit-identical determinism contract achievable on one build.

CC      ?= cc
CSTD    ?= -std=c11
OPT     ?= -O2
WARN    ?= -Wall -Wextra -Wno-unused-parameter
FP      ?= -ffp-contract=off -fno-fast-math
CFLAGS  += $(CSTD) $(OPT) $(WARN) $(FP) -D_GNU_SOURCE -Iinclude -Isrc -Itests
LDFLAGS += -lm -lpthread

BUILD := build
SRC := src/core/xen_engine.c \
       src/core/xen_command.c \
       src/core/xen_voice.c \
       src/core/xen_entrophon.c \
       src/core/xen_asset.c \
       src/core/xen_recorder.c \
       src/dsp/xen_dsp.c \
       src/programs/xen_prog_granular.c \
       src/backends/xen_backend_null.c \
       src/backends/xen_backend_pipewire.c \
       src/adapters/xen_xensonar.c

ifdef PIPEWIRE
CFLAGS += -DXEN_WITH_PIPEWIRE $(shell pkg-config --cflags libpipewire-0.3)
LDFLAGS += $(shell pkg-config --libs libpipewire-0.3)
endif

OBJ := $(patsubst src/%.c,$(BUILD)/%.o,$(SRC))
LIB := $(BUILD)/libxenaudio.a

TESTS := test_determinism test_partition test_epoch test_lifecycle \
         test_assets test_overload test_recording test_planning test_hardening test_concurrency test_toneplan test_entrophon
TESTBINS := $(addprefix $(BUILD)/,$(TESTS)) $(BUILD)/test_rt_alloc
TOOLS := $(BUILD)/xen-render $(BUILD)/xen-bench
ifdef PIPEWIRE
TOOLS += $(BUILD)/xen-host
endif

.PHONY: all test clean
all: $(LIB) $(TESTBINS) $(TOOLS)

$(BUILD)/%.o: src/%.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

$(LIB): $(OBJ)
	@mkdir -p $(BUILD)
	ar rcs $@ $(OBJ)

$(BUILD)/test_rt_alloc: tests/test_rt_alloc.c tests/rt_alloc_wrap.c $(LIB)
	@mkdir -p $(BUILD)
	$(CC) $(CFLAGS) -Itests $^ -o $@ $(LDFLAGS) \
	  -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=posix_memalign

$(BUILD)/test_%: tests/test_%.c $(LIB)
	@mkdir -p $(BUILD)
	$(CC) $(CFLAGS) -Itests $< $(LIB) -o $@ $(LDFLAGS)

$(BUILD)/xen-render: tools/xen_render.c $(LIB)
	@mkdir -p $(BUILD)
	$(CC) $(CFLAGS) $< $(LIB) -o $@ $(LDFLAGS)

$(BUILD)/xen-bench: tools/xen_bench.c $(LIB)
	@mkdir -p $(BUILD)
	$(CC) $(CFLAGS) $< $(LIB) -o $@ $(LDFLAGS)

$(BUILD)/xen-host: tools/xen_host.c $(LIB)
	@mkdir -p $(BUILD)
	$(CC) $(CFLAGS) $< $(LIB) -o $@ $(LDFLAGS)

test: all
	@bash tests/run_all.sh

clean:
	rm -rf $(BUILD)
