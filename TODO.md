## Pending Tasks
  - separate capacity estimation and Rs balanced and performance of the plant at the Rs balanced ("theoretical" values vs "actual")
  - refactor plant model into its own repository.
  - take out balances code from technologies and calculate after processes (pst+as+cpr+nit+dn).
  - discuss with george the effect of the pH in FePO4 formation (Szabo et al 2008)

## Future / new modules to be added
  - energy consumption module (reuse ecoinvent equations)
  - oxygen limitation module (reuse ecoinvent equations)
  - bio P removal EBPR module
  - pH effect on chemical P removal (as found on Szabo et al)
  - anaerobic digestion module (will consider inorganic carbon exiting, created from TOC)
  - stoichiometry for CO2 produced
  - [GUI] add a source code viewer to see equations
  - [GUI] API

## Tasks done/solved/clear/discussed
  - [done] validate test values of X.tave and Q.ADWF in the user interface.
  - [done] validate test values of Rs/Rsm/Rs.bal/IR/a.opt/a.prac.
  - [done] K.O in ASM1 = 0.4
  - [done] confirm final Rsm formula (min sludge age to ensure nitrification).
  - [done] add errors in nitrification when: (1) fxt > fxm, (2) Rs < Rsm
  - [done] add incomplete BOD removal
  - [done] mass of nitrifiers (MX-BA) no worry about it (<3% of MX-T)
  - [done] anoxic volume (fxt related)
  - [done] pH sensitivity in nitrification
  - [done] DO inhibition in nitrification
  - [done] denitrification outputs (units and descriptions)
  - [done] Qw wastage (waste from reactor or sst)
  - [done] extra-iSS produced in CPR to wastage and MX-IO
  - [done] influent nitrate (NOx): if we have influent NOx, TOD balance not closing.
  - [done] OHO as a new state variable
  - [done] kg of FeCl3 added is not equal to the extra iSS produced (for example 3000 kg FeCl3 produces ~2500 kg iSS. The remaining ~500 kg is Cl(-) ion?).
  - [done] let Dp1RBSO = Sbsi·(1-fCV·YH)/2.86;
  - [done] generate export and import links in "tests/fase1.html"
  - [done] architecture class diagram.
  - [done] integrate constants.js to the code.
  - [done] integrate X.tave loop + Q.ADWF.max in a new process.
  - [done] warnings module in "tests/fase1.html"
  - [done] add check for exported URL above 2k characters.
