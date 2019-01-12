/*RECOMANADOR fase 1 (1 planta + 1 riu)*/

//import files
try{
  State_Variables = require('./state-variables.js');    //class State_Variables
  Plant           = require('./plant.js');              //class Plant
  Tram            = require('./tram.js');               //class Tram
  run_model       = require('./run_model.js');          //function run model
}catch(e){}

//run model n vegades
function run_simulacions(plant, river, degradation, variacions){
  let combinacions=[]; //return value: totes les combinacions fetes

  //recursive call to iterate input variations
  function itera_variacions(variacions, i){
    i = i || 0; //int: index actual de la clau de l'objecte variacions

    let keys = Object.keys(variacions);
    if(i>=keys.length){
      //executa simulació "n"
      let run = run_model(plant, river, degradation);
      //combinació actual
      let combinacio = {
        Rs:         plant.parameters.Rs,
        RAS:        plant.parameters.RAS,
        DO:         plant.parameters.DO,
        mass_FeCl3: plant.parameters.mass_FeCl3,
        plant:      run.plant,
        river:      run.river,
      };
      combinacions.push(combinacio);
      return;
    }

    let key=keys[i]; //clau actual
    variacions[key].forEach(n=>{
      plant.parameters[key]=n;           //modifica input
      itera_variacions(variacions, i+1); //modifica el següent input
    });
  };

  itera_variacions(variacions);
  console.log(`simulacions_fetes: ${combinacions.length}`);
  return combinacions;
};

/*test*/
let plant;        //global accessible to DOM (input)
let variacions;   //global accessible to DOM (input)
let limits;       //global accessible to DOM (input)
let combinacions; //global accessible to DOM (output)
(function(){
  /*new plant*/
  plant=new Plant(
    //-----------------(Q   VFA FBSO BPO  UPO  USO iSS FSA   OP    NOx OHO)
    new State_Variables(25, 50, 115, 440, 100, 45, 60, 39.1, 7.28, 0,  0  ),
    {pst:false, nit:true, dn:true, cpr:true, river:true},
    {
      fw           : 0.005,     //ø     | PST | fraction of Q that goes to wastage
      removal_BPO  : 42.3352,   //%     | PST | removal of the component X_BPO
      removal_UPO  : 90.05,     //%     | PST | removal of the component X_UPO
      removal_iSS  : 75.125,    //%     | PST | removal of the component X_iSS
      T            : 16,        //ºC    | AS  | temperature
      Vp           : 8473.3,    //m3    | AS  | reactor volume
      Rs           : 15,        //d     | AS  | solids retention time or sludge age
      RAS          : 1.0,       //ø     | AS  | SST underflow recycle ratio
      waste_from   : "reactor", //option| AS  | waste_from | options {'reactor','sst'}
      mass_FeCl3   : 3000,      //kg/d  | CPR | mass of FeCl3 added for chemical P removal
      SF           : 1.25,      //ø     | NIT | safety factor. design choice. Moves the sludge age
      fxt          : 0.39,      //ø     | NIT | current unaerated sludge mass fraction
      DO           : 2.0,       //mgO/L | NIT | DO in the aerobic reactor
      pH           : 7.2,       //ø     | NIT | pH
      IR           : 5.4,       //ø     | DN  | internal recirculation ratio
      DO_RAS       : 1.0,       //mgO/L | DN  | DO in the underflow recycle
      influent_alk : 250,       //mg/L  | DN  | influent alkalinity (mg/L CaCO3)
    },
  );

  //riu upstream.---(wb      wt      Db        S          n       Li    Di   Ti)
  let river=new Tram(25.880, 62.274, 18.45841, 0.0010055, 0.0358, 2000, 0.6, 15);

  //degradació riu
  let degradation={
    R_20 :{ NH4:0.0000005, PO4:0.0000005 },
    k    :{ NH4:1,         PO4:1         },
  };

  //variacions inputs planta
  variacions={
    Rs:        [6,    8,    10,   12,   15,   20,  25, 30, 40 ], //d
    RAS:       [0.75, 0.85, 0.95, 1.05, 1.15, 1.25            ], //ø
    DO:        [1.00, 1.50, 2.00, 2.50                        ], //mgO/L
    mass_FeCl3:[500,  600,  700,  800, 900, 1000              ], //kg/d
  };

  //executa recomanador
  combinacions = run_simulacions(plant, river, degradation, variacions);

  //limits per les combinacions (input)
  limits={
    plant:  {NH4:15,  PO4:2},
    river:  {NH4:0.5, PO4:0.5},
    errors: 0,
  };
})();
