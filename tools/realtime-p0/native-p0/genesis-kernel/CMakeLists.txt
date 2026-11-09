cmake_minimum_required(VERSION 3.16)
project(xen_audio C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

option(XEN_WITH_PIPEWIRE "Build the PipeWire backend" OFF)

add_compile_options(-Wall -Wextra -Wno-unused-parameter)
# Determinism: no FMA contraction, no fast-math. The bit-identical contract in
# README.md depends on these.
add_compile_options(-ffp-contract=off -fno-fast-math)
add_compile_definitions(_GNU_SOURCE)

set(XEN_SOURCES
    src/core/xen_engine.c
    src/core/xen_command.c
    src/core/xen_voice.c
    src/core/xen_entrophon.c
    src/core/xen_asset.c
    src/core/xen_recorder.c
    src/dsp/xen_dsp.c
    src/programs/xen_prog_granular.c
    src/backends/xen_backend_null.c
    src/backends/xen_backend_pipewire.c
    src/adapters/xen_xensonar.c)

add_library(xenaudio STATIC ${XEN_SOURCES})
target_include_directories(xenaudio PUBLIC include PRIVATE src)
find_library(M_LIB m)
target_link_libraries(xenaudio PUBLIC ${M_LIB} pthread)

if(XEN_WITH_PIPEWIRE)
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(PIPEWIRE REQUIRED libpipewire-0.3)
    target_compile_definitions(xenaudio PRIVATE XEN_WITH_PIPEWIRE)
    target_include_directories(xenaudio PRIVATE ${PIPEWIRE_INCLUDE_DIRS})
    target_link_libraries(xenaudio PUBLIC ${PIPEWIRE_LIBRARIES})
    target_link_directories(xenaudio PUBLIC ${PIPEWIRE_LIBRARY_DIRS})
endif()

# ------------------------------------------------------------------- tools
add_executable(xen-render tools/xen_render.c)
target_include_directories(xen-render PRIVATE tests)
target_link_libraries(xen-render xenaudio)

add_executable(xen-bench tools/xen_bench.c)
target_include_directories(xen-bench PRIVATE tests)
target_link_libraries(xen-bench xenaudio)

if(XEN_WITH_PIPEWIRE)
    add_executable(xen-host tools/xen_host.c)
    target_include_directories(xen-host PRIVATE tests)
    target_link_libraries(xen-host xenaudio)
endif()

# ------------------------------------------------------------------- tests
enable_testing()
set(XEN_TESTS determinism partition epoch lifecycle assets overload recording planning hardening concurrency toneplan entrophon)
foreach(t ${XEN_TESTS})
    add_executable(test_${t} tests/test_${t}.c)
    target_include_directories(test_${t} PRIVATE tests)
    target_link_libraries(test_${t} xenaudio)
    add_test(NAME ${t} COMMAND test_${t})
endforeach()

# The allocation detector needs linker wrapping; if the toolchain cannot do it
# the test reports NOT VERIFIED rather than passing vacuously.
add_executable(test_rt_alloc tests/test_rt_alloc.c tests/rt_alloc_wrap.c)
target_include_directories(test_rt_alloc PRIVATE tests)
target_link_libraries(test_rt_alloc xenaudio)
target_link_options(test_rt_alloc PRIVATE
    -Wl,--wrap=malloc -Wl,--wrap=calloc -Wl,--wrap=realloc
    -Wl,--wrap=free -Wl,--wrap=posix_memalign)
add_test(NAME rt_alloc COMMAND test_rt_alloc)
