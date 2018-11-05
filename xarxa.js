
//import "State_Variables" class only in node
if(typeof document == "undefined"){Tram=require("./tram.js");}

//xarxa de trams de riu
class Xarxa {
  constructor(){
    this.trams=[ ]; //<Tram> array
  }

  //mira si un tram es "calculable"
  //calculable vol dir que els seus pares son calculables
  es_calculable(tram){
    //si no té pares vol dir que és calculable (=inici de tram)
    if(tram.pares.in1===null && tram.pares.in2===null)
      return true;
    else{
      return (
        this.es_calculable(tram.pares.in1) //el pare 1 és calculable?
        &&                                 //i 
        this.es_calculable(tram.pares.in2) //el pare 2 és calculable?
      );
    }
  }

  get trams_calculables(){
    this.trams.forEach(tram=>{
      console.log(this.es_calculable(tram));
    });
  }

}

/*test*/
(function test(){

  //crea 3 trams i connecta'ls
  let xarxa = new Xarxa(); 
    let t1 = new Tram(); //pare1
    let t2 = new Tram(); //pare2
    let t3 = new Tram(); //fill
    t3.pares.in1=t1;
    t3.pares.in2=t2;
    //afegeix els trams a "this.trams"
    this.trams.push(t1);
    this.trams.push(t2);
    this.trams.push(t3);
  xarxa.trams_calculables;
})();
