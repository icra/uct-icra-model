## Tasks
  - separate capacity estimation and Rs balanced and performance of the plant at the Rs balanced ("theoretical" values vs "actual")
  - refactor plant model into its own repository.
  - take out balances code from technologies and calculate after processes (pst+as+cpr+nit+dn).

## Future / new functionality to be added
  - energy consumption module (reuse ecoinvent equations)
  - oxygen limitation module (reuse ecoinvent equations)
  - bio P removal EBPR module
  - pH effect on chemical P removal (as found on Szabo et al)
  - anaerobic digestion module (will consider inorganic carbon exiting, created from TOC)
  - stoichiometry for CO2 produced
  - [GUI] add a source code viewer to see equations
  - [GUI] API

## Tasks done/solved/clear/discussed
  - [model] validate test values of X.tave and Q.ADWF in the user interface.
  - [model] validate test values of Rs/Rsm/Rs.bal/IR/a.opt/a.prac.
  - [model] K.O in ASM1 = 0.4
  - [model] confirm final Rsm formula (min sludge age to ensure nitrification).
  - [model] add errors in nitrification when: (1) fxt > fxm, (2) Rs < Rsm
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
  - [model] kg of FeCl3 added is not equal to the extra iSS produced (for example 3000 kg FeCl3 produces ~2500 kg iSS. The remaining ~500 kg is Cl(-) ion?).
  - [denitri] let Dp1RBSO = Sbsi·(1-fCV·YH)/2.86;
  - [river] R20 and k for NH4 and PO4
  - [river] names S-OP and S-FSA to PO4 and NH4 in the interface only
  - [gui] generate links for fase1.html
  - [done] architecture class diagram.
  - [done] integrate constants.js to the code.
  - [done] integrate X.tave loop + Q.ADWF.max in a new process.
  - [done] warnings module
  - [done] add check for exported URL above 2k characters.
