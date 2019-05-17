## Pending Tasks (~new branches)
  - look into this dataset: http://localhost/icra/ecoadvisor/uct-icra-model/examples/run-model.html?Q=25&S_VFA=0.001&S_FBSO=0.001&X_BPO=0.001&X_UPO=0.001&S_USO=0.001&X_iSS=0.001&S_FSA=0.001&S_OP=0.001&S_NOx=0.001&X_OHO=0&pst=false&fw=0.005&removal_BPO=42.3352&removal_UPO=90.0500&removal_iSS=75.1250&as=true&T=16&Vp=8473.3&Rs=15&RAS=1.0&DSVI=120&A_ST=30000&fq=2.4&nit=false&SF=1.25&fxt=0.39&DO=2.0&pH=7.2&dn=false&IR=5.4&DO_RAS=1.0&influent_alk=250&cpr=false&mass_FeCl3=3000&f_CV_VFA=1.0667&f_C_VFA=0.4000&f_N_VFA=0.0000&f_P_VFA=0.0000&f_CV_FBSO=1.4200&f_C_FBSO=0.4710&f_N_FBSO=0.0464&f_P_FBSO=0.0118&f_CV_BPO=1.5230&f_C_BPO=0.4980&f_N_BPO=0.0323&f_P_BPO=0.0072&f_CV_UPO=1.4810&f_C_UPO=0.5180&f_N_UPO=0.1000&f_P_UPO=0.0250&f_CV_USO=1.4930&f_C_USO=0.4980&f_N_USO=0.0366&f_P_USO=0.0000&f_CV_OHO=1.4810&f_C_OHO=0.5180&f_N_OHO=0.1000&f_P_OHO=0.0250&YH=0.666&bH=0.240&theta_bH=1.029&k_v20=0.07&theta_k_v20=1.035&fH=0.200&f_iOHO=0.150&µAm=0.450&theta_µAm=1.123&K_O=0.400&theta_pH=2.350&Ki=1.130&Kii=0.300&Kmax=9.500&YA=0.100&Kn=1.000&theta_Kn=1.123&bA=0.040&theta_bA=1.029&K2_20=0.101&theta_K2=1.080&waste_from=reactor
  - discuss if we can express the model as gujer matrix
  - low values of influent COD fractions (~0.01) create problems: COD balance is not 100%, due to FOn, and Nne also is not correct, in denitrification (nitrate "appears").
  - discuss with george the effect of the pH in FePO4 formation (Szabo et al 2008)
  - ask george to make skype to play with model interface and:
    - watch out for: Rs Rsm a a-opt.
  - function that pretty prints a plant.run() result for reporting.

## Future / new modules TBD
  - energy consumption module (reuse ecoinvent equations)
  - oxygen limitation module (reuse ecoinvent equations)
  - bio P removal EBPR module
  - pH effect on chemical P removal (as found on Szabo et al)
  - anaerobic digestion module (will consider inorganic carbon exiting, created
    from TOC)
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
