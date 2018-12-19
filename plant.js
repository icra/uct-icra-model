/* 
  wastewater treatment plant class

  influent → [plant] → effluent
               ↓ ↓     
             wastages (primary and secondary)
*/

class Plant {
  constructor(influent, configuration, parameters){
    this.influent      = influent;      //state variables object
    this.configuration = configuration; //object {pst,nit,dn,cpr}
    this.parameters    = parameters;    //object {fw,removal_BPO,removal_UPO,removal_iSS,T,Vp,Rs,RAS,waste_from,mass_FeCl3,SF,fxt,DO,pH,IR,DO_RAS,influent_alk}
  };

  run(){
    /*
      inputs
      - influent: state variables object
      - tram:     tram object
      - conf:     dictionary for plant configuration
      - i:        dictionary for plant inputs
      - deg:      dictionary for river degradation 
    */
    let c = this.configuration;
    let p = this.parameters;

    //primary settler
    let pst;
    if(c.pst) pst = this.influent.primary_settler(p.fw, p.removal_BPO, p.removal_UPO, p.removal_iSS);
    else      pst = { effluent:influent, wastage:null };

    //chemical P removal
    if(conf.cpr==false){ i.mass_FeCl3=0; }

    //AS + ( NIT + (DN) )
    let as;
    if(conf.dn)       as = pst.effluent.denitrification (i.T,i.Vp,i.Rs,i.RAS,i.waste_from,i.mass_FeCl3,i.SF,i.fxt,i.DO,i.pH,i.IR,i.DO_RAS,i.influent_alk);
    else if(conf.nit) as = pst.effluent.nitrification   (i.T,i.Vp,i.Rs,i.RAS,i.waste_from,i.mass_FeCl3,i.SF,i.fxt,i.DO,i.pH);
    else              as = pst.effluent.activated_sludge(i.T,i.Vp,i.Rs,i.RAS,i.waste_from,i.mass_FeCl3,);

    //pack process variables
    let as_process_variables  = conf.dn ? as.as_process_variables  : (conf.nit ? as.as_process_variables : as.process_variables);
    let nit_process_variables = conf.dn ? as.nit_process_variables : (conf.nit ? as.process_variables    : null);
    let dn_process_variables  = conf.dn ? as.process_variables     : null;

    //results
    return {
      warnings,          //(Rs<Rsm and/or fxt>fxm)
      process_variables,
      effluent, //state variables
      wastages, //{primary, secondary}
    };
  };
}
