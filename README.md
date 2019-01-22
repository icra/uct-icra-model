# Ecoadvisor 
Backend model for ecoadvisor project.
Coded in Javascript without dependencies.
MLE steady state model by George Ekama.
Implemented by Lluís Bosch.

## Status: under development 

## next call george ekama
  - discuss with lluís corominas EBPR.
  - discuss pH effect on chemical P removal

## Lluís B. tasks (ordered by priority)
  - add a.prac as new input for denitrification.
  - take out balances code from technologies and calculate after processes.
  - refactor plant model into its own repository.
  - warnings module:
    - Reactor kgTSS (MX.T) above the limit (given a reactor volume Vp)
    - fxt > fxm.
    - Rs  < Rsm.
    - effluent alkalinity < 50 mg/L as CaCO3.

## Future
  - new energy consumption module.
  - new anaerobic digestion module (will consider inorganic carbon exiting,
    created from TOC).
  - new stoichiometry for CO2 produced.
  - [GUI] add a source code viewer to see equations.
  - [GUI] API.

## Done/solved/clear/discussed
  - [model] K.O in ASM1 = 0.4
  - [model] confirm final Rsm formula (min sludge age to ensure nitrification).
  - [model] add errors in nitrification when: (1) fxt > fxm, (2) Rs  < Rsm
  - [model] add incomplete BOD removal
  - [model] mass of nitrifiers (MX-BA) no worry about it (<3% of MX-T)
  - [model] anoxic volume (fxt related)
  - [model] pH sensitivity in nitrification
  - [model] DO inhibition in nitrification
  - [model] denitrification outputs (units and descriptions)
  - [model] Qw wastage (waste from reactor or sst)
  - [model] extra-iSS produced in CPR to wastage and MX-IO
  - [model] influent nitrate (NOx): if we have influent NOx, TOD balance not closing.
  - [model] OHO as a new state variable
  - [model] kg of FeCl3 added is not equal to the extra iSS produced
    (for example 3000 kg FeCl3 produces ~2500 kg iSS. The remaining ~500 kg is
    Cl(-) ion?).
  - [as model] let Dp1RBSO = Sbsi·(1-fCV·YH)/2.86;
  - [river] R20 and k for NH4 and PO4
  - [river] names S-OP and S-FSA to PO4 and NH4 in the interface only
  - [gui] generate links for fase1.html
  - [done] architecture class diagram.
  - [done] integrate constants.js to the code.
  - [done] integrate X.tave loop + Q.ADWF.max in a new process.

## List of process types
  - MLE (Modified Ludzack Ettinger) <-- **this model**
  - JHB (Johannesburg process)
  - UCT (University of Cape Town process)
  - MUCT (Modified University of Cape Town process)
  - VIP (Virginia initiative plant process)
  - ? (finish list TODO)

## Documentation
  - equations: "formulas/formulas.ms" file is compiled into "formulas/formulas.ms.pdf" using groff(1).
  - architecture: "architecture/architecture.org" file is compiled into "architecture/architecture.html" using emacs(1) org-mode export function.

## Model assumptions
  - Process is MLE (Modified Ludzack Ettinger).
  - Influent X.OHO is always 0.
  - Influent S.VFA and X.BPO are 100% consumed into biomass during the 'activated sludge' process.
  - S.FBSO is *not* 100% consumed because it depends on the HRT (fast), whereas
    the X.BPO depends on Rs (slower).
  - Solids in the effluent (X.iSS, X.UPO, X.OHO, X.BPO) are 0.
  - All CO2 produced is stripped out.
  - Inorganic carbon is not included in the carbon balance over the AS reactor,
    because it's very small.
  - The additional FeCl3 solution volume added for chemical P removal is considered ~0.
