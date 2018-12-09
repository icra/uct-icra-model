# about ecoadvisor 
Backend model for Ecoadvisor project. Coded in Javascript without dependencies.
Steady state model by George Ekama. Implemented by Lluís Bosch (lbosch@icra.cat).

## status: under development 

## doubts/pending/ask george ekama
- [next skype] discuss about formulas for for Ns, Ps, FOc regarding to mass ratios
- [next skype] confirm final Rsm formula (min sludge age to ensure nitrification). options:
  - see 'nitrification.js' line 78
- [next skype] influent nitrate (NOx): if we have influent NOx, TOD balance not closing.
  - denitrification.js:  let B = Nc-Dp1+((1+RAS)·DO + RAS·DO_RAS)/2.86; //ask george how influent nitrate affects this
  - denitrification.js:  let C = (1+RAS)·(Dp1-RAS·DO_RAS/2.86)-RAS·Nc;  //ask george how influent nitrate affects this
- [next skype] why is kg of FeCl3 added is not equal to the extra iSS produced (for example 3000 kg FeCl3 produces ~2500 kg iSS. The remaining ~500 kg is Cl(-) ion?).
- [next skype] denitrification.js:  let Dp1RBSO = Sbsi·(1-fCV·YH)/2.86;    //mgN/L | ask george if we shoud subtract S_b (FBSO not degraded) here
- [next skype] denitrification.js:  let Dp1BPO  = K2T·fxt·(Sbi-S_b)·f_XBH; //mgN/L | fxt vs fx1
- [next skype] denitrification.js:  let FN2g = Q·(Nc - Nne); //kgN/d | N2 gas produced ask George if this is correct
- [next skype] current DO "KO" value is 0.5 (µ = µ·DO/(DO+KO)). Book says KO value is [0.3, 2.0]. Which one I keep?

## Lluís B. tasks (ordered by priority)
  - integrate constants.js to the code
  - write equations in pdf (file "formulas.ms")
  - add a 'see.php' source code syntax viewer for html
  - ./activated-sludge.js: change kv to 0.07 (high value makes that BSO effluent is ≈ 0) 

## Future
  - add energy consumption module
  - add anaerobic digestion module
  - add stoichiometry (for {CO2, N2}(air) produced)

## done/solved/clear/discussed
  - [gui] generate links for fase1.html
  - [river] R20 and k for NH4 and PO4
  - [river] names S-OP and S-FSA to PO4 and NH4 in the interface only
  - [as model] add errors in nitrification when: (1) fxt > fxm, (2) Rs  < Rsm
  - [as model] add incomplete BOD removal
  - [as model] mass of nitrifiers (MX-BA) no worry about it (<3% of MX-T)
  - [as model] anoxic volume (fxt related)
  - [as model] pH sensitivity in nitrification
  - [as model] DO inhibition in nitrification
  - [as model] denitrification outputs (units and descriptions)
  - [as model] Qw wastage (waste from reactor or sst)
  - [as model] extra-iSS produced in CPR to wastage and MX-IO
