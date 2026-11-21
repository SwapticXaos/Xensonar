/* Lazy proxies for Fractalia F2/F3/F4 & Donor Ecology (117 KB stays inert until Fractalia is accessed). */
const __Fractalia=__xenLazyObject('forge-fractalia','__Fractalia');
const __FractaliaLiveTransfer=__xenLazyObject('forge-fractalia','__FractaliaLiveTransfer');
const __FractaliaMaterialRuntime=__xenLazyObject('forge-fractalia','__FractaliaMaterialRuntime');
const __FractaliaExperiments=__xenLazyObject('forge-fractalia','__FractaliaExperiments');
function fractaliaDonorSnapshot(...args){return __xenLoadChunk('forge-fractalia').fractaliaDonorSnapshot(...args)}
