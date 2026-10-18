function __f341RestoreSound(item) {
    if (item.combination && "undefined" != typeof __F352Session && __F352Session.restore(item.combination), 
    item.cecilia && "undefined" != typeof pe) {
        const st = pe.getState(), lab = st.carrierIntegralSynthLab;
        lab && st.setCarrierIntegralSynthLab && st.setCarrierIntegralSynthLab({
            ...lab,
            readerSettings: {
                ...lab.readerSettings,
                vocal: {
                    ...item.cecilia
                }
            },
            updatedAt: Date.now()
        });
    }
}

function __f341SoundSettings() {
    return {
        ..."undefined" != typeof __F352Session ? {
            combination: __F352Session.export()
        } : {},
        ..."undefined" != typeof pe && "function" == typeof xR ? {
            cecilia: xR("vocal", pe.getState().carrierIntegralSynthLab?.readerSettings)
        } : {}
    };
}
