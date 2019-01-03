# Ecoadvisor 
Backend model for ecoadvisor project. Coded in Javascript without dependencies.
Steady state model by George Ekama. Implemented by Lluís Bosch
(lbosch@icra.cat).

## Status: under development 

## Model assumptions
  - Influent X.OHO is always 0.
  - Influent S.VFA and X.BPO are 100% consumed into biomass.
  - S.FBSO is *not* 100% consumed because it depends on the HRT (fast), whereas
    the X.BPO depends on Rs (slower).
  - Solids in the effluent (X.iSS, X.UPO, X.OHO, X.BPO) are 0.
  - All CO2 produced is stripped out.
  - Inorganic carbon is not included in the carbon balance over the AS reactor,
    because it's very small.
  - The additional FeCl3 volume added for chemical P removal is considered ~0.

## Lluís B. tasks (ordered by priority)
  - esquema arquitectura draw.io diagrama de classes.
  - https://docs.google.com/document/d/1SB_aU166oTju9D4K1m4tUuoW-Lbto_uHtzzMINb-CJs/edit#
  - read SST capacity paper (add a limit for X.T concentration for a given reactor volume (Vp)).
  - read dynamic comparison paper.
  - [pending] integrate constants.js to the code.
  - [pending] take out balances from technologies.
  - [pending] add a 'see.php' source code syntax viewer for html.
  - [pending] API.
 
## Doubts/pending/ask george ekama
  - create item list with lluís corominas

## Documentation
  - the equations are in "formulas/formulas.ms" which is compiled to "formulas/formulas.ms.pdf".

## Future
  - new warnings module
    - fxt and Rs compared to fxm and Rsm.
    - effluent alkalinity below 50 mg/L as CaCO3.
    - Reactor kgTSS (MX.T) above the limit (given a reactor volume Vp)
  - new energy consumption module.
  - new anaerobic digestion module (will consider inorganic carbon exiting,
    created from TOC).
  - new stoichiometry for CO2 produced.

## Done/solved/clear/discussed
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
    (for example 3000 kg FeCl3 produces ~2500 kg iSS. The remaining ~500 kg is Cl(-) ion?).
  - [as model] let Dp1RBSO = Sbsi·(1-fCV·YH)/2.86;
  - [river] R20 and k for NH4 and PO4
  - [river] names S-OP and S-FSA to PO4 and NH4 in the interface only
  - [gui] generate links for fase1.html
