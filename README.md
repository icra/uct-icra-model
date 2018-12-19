# about ecoadvisor 
Backend model for Ecoadvisor project. Coded in Javascript without dependencies.
Steady state model by George Ekama. Implemented by Lluís Bosch (lbosch@icra.cat).

## status: under development 

## Model assumptions
  - X.OHO influent is 0.
  - S.VFA and X.BPO are 100% consumed and turned into biomass (they are 0 at the effluent).
  - S.FBSO is not consumed 100% because it depends on the HRT, whereas the X.BPO depends on Rs (slower).
  - Solids in effluent (X.BPO, X.UPO, X.OHO) are 0.
  - All CO2 produced is stripped out.
  - Inorganic carbon not included (it's very small) in the carbon balance over the AS reactor.

## doubts/pending/ask george ekama
  - create item list with lluís corominas

## Lluís B. tasks (ordered by priority)
  - read dynamic comparison paper.
  - read SST capacity paper (add a limit for X.T concentration for a given reactor volume (Vp)).
  - add a warning for effluent alkalinity below 50 mg/L as CaCO3.
  - [not finished] write equations in pdf (file "formulas.ms").
  - [pending]      integrate constants.js to the code.
  - [pending]      take out balances from technologies.
  - [pending]      add a 'see.php' source code syntax viewer for html.
  - [pending]      API.

## Future
  - add energy consumption module.
  - add anaerobic digestion module (will consider inorganic carbon exiting, created from TOC).
  - add stoichiometry for CO2 produced.

## done/solved/clear/discussed
  - [as model] check K.O in ASM1 = 0.4
  - [as model] confirm final Rsm formula (min sludge age to ensure nitrification).
  - [as model] add errors in nitrification when: (1) fxt > fxm, (2) Rs  < Rsm
  - [as model] add incomplete BOD removal
  - [as model] mass of nitrifiers (MX-BA) no worry about it (<3% of MX-T)
  - [as model] anoxic volume (fxt related)
  - [as model] pH sensitivity in nitrification
  - [as model] DO inhibition in nitrification
  - [as model] denitrification outputs (units and descriptions)
  - [as model] Qw wastage (waste from reactor or sst)
  - [as model] extra-iSS produced in CPR to wastage and MX-IO
  - [as model] influent nitrate (NOx): if we have influent NOx, TOD balance not closing.
  - [as model] OHO as a new state variable
  - [as model] why is kg of FeCl3 added is not equal to the extra iSS produced
    (for example 3000 kg FeCl3 produces ~2500 kg iSS. The remaining ~500 kg is
    Cl(-) ion?).
  - [as model] let Dp1RBSO = Sbsi·(1-fCV·YH)/2.86;
  - [river] R20 and k for NH4 and PO4
  - [river] names S-OP and S-FSA to PO4 and NH4 in the interface only
  - [gui] generate links for fase1.html
