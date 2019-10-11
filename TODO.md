## Pending Tasks
  - bio P: george sends hand calculations and laura + lluís check it.
  - add note
    "this model was tested and checked against the ekama plant wide spreadsheet
    using the ww characteristics in [WRC 1984, EKAMA 2011, HENZE ET AL 2008,
    EKAMA 2017] and gave answers less than 0.1% difference for the raw and settled ww characteristics"
  - replace FOt calculations in denitrification (add a note in nitrification "without denitrification")
  - save plant layout to json file in "run-model-multiple.html".
  - discuss with george:
    - "what if all influent BSO is VFA" scenario (what happens to MX-BH?).
    - idea: compute OHO mass ratios instead of being inputs from influent
      composition.
    - play with the run-model interface and observe Rs, Rsm, a, a-opt
      relationship.
    - chemical P removal (see papers at dev-docs folder).
  - implement "warnings" module (numeric checks for physical meaning) -> expand
    "error" capturing functionality.
  - [for reporting] function for pretty printing a plant.run() result.

## discussed in skype
  - do not show results if we have warnings
  - put Rs-bal in capacity estimation module

## Future / new modules TBD
  - energy consumption module (started, not integrated)
  - chemical P removal (as found on Szabo et al)
  - oxygen limitation module (reuse ecoinvent equations)
  - bio P removal EBPR module
  - anaerobic digestion module (will consider inorganic carbon exiting, created
    from TOC)
  - stoichiometry for CO2 produced

## Tasks done/solved/clear/discussed
  - [done] validate test values of X.tave and Q.ADWF in the user interface.
  - [done] validate test values of Rs/Rsm/Rs.bal/IR/a.opt/a.prac.
  - [done] K.O in ASM1 = 0.4
  - [done] confirm final Rsm formula (min sludge age to ensure nitrification).
  - [done] add errors in nitrification when: (1) fxt > fxm, (2) Rs < Rsm
  - [done] add incomplete BOD removal
  - [done] mass of nitrifiers (MX-BA): do not worry about it (because is less than 3% of MX-T)
  - [done] anoxic volume (fxt related)
  - [done] pH sensitivity in nitrification
  - [done] DO inhibition in nitrification
  - [done] denitrification outputs (units and descriptions)
  - [done] Qw wastage (waste from reactor or sst)
  - [done] extra-iSS produced in CPR to wastage and MX-IO
  - [done] influent nitrate (NOx): if we have influent NOx, TOD balance not closing.
  - [done] OHO as a new state variable
  - [done] kg of FeCl3 added is not equal to the extra iSS produced (for
    example 3000 kg FeCl3 produces ~2500 kg iSS. The remaining ~500 kg is Cl(-) ion?).
  - [done] let Dp1RBSO = Sbsi·(1-fCV·YH)/2.86;
  - [done] generate export and import links in "tests/fase1.html"
  - [done] architecture class diagram.
  - [done] integrate constants.js to the code.
  - [done] integrate X.tave loop + Q.ADWF.max in a new process.
  - [done] warnings module in "tests/fase1.html"
  - [done] add check for exported URL above 2k characters.
  - [done] refactor plant model into its own repository.
  - [done] add input numeric checks for all functions with "throw" statements
  - [done] change YH = 0.45 gVSS/gCOD to YH = 0.666 gCOD/gCOD
  - [done] refactor warnings/errors output from plant object
  - [done] output in a new object the capacity estimation results ("theoretical" values).
  - [done] check to ensure S-b < F-BSO.
