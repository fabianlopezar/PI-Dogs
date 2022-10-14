const { Router } = require("express");
// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');
const axios = require("axios");
const { Dog, Temperament, Op } = require("../db");
const { routes } = require("../app");

const router = Router();

// Configurar los routers
// Ejemplo: router.use('/auth', authRouter);
//----------------- FUNCION OBETENER API-------------------------------------------------------------------------------------------------
const getApiInfo = async () => {
  try {
    const apiUrl = await axios.get("https://api.thedogapi.com/v1/breeds");
    const apiInfo = await apiUrl.data.map((el) => {
      return {
        name: el.name,
        id: el.id,
        height_min: el.height.metric.split(" - ")[0],
        height_max: el.height.metric.split(" - ")[1],
        weight_min:el.weight.metric.split(" - ")[0] !== "NaN"? el.weight.metric.split(" - ")[0]: 6,
        weight_max: el.weight.metric.split(" - ")[1],
        life_min: el.life_span.split(" - ")[0],
        life_max: el.life_span.split(" - ")[1],
        temperament: el.temperament? el.temperament: "🐕No hay temperamento🐕",
        origin: el.origin,
      };
    });
    return apiInfo;
  } catch (error) {
    console.log("Sucedio un error en getApiInfo: ", error);
  }
};
//------------------- FUNCION OBTENER LA DATA BASE ---------------------------------------------------------------------------------------------------
const getDbInfo = async () => {
  try {
    return await Dog.findAll({
      include: {
        model: Temperament,
        attributes: ["name"], //traigo el nombre de los temperamentos
        through: {
          attributes: [], // tomo solo lo que me queda en el arreglo attribute
        },
      },
    });
  } catch (error) {
    console.log("Sucedio un error en getDbInfo: ",error)
  }
}; 
//------------------- UNIR INFORMACION -----------------------------------------------------------------------------------
const getAllDogs= async()=>{
    try{
        const apiInfo= await getApiInfo()
        const dbInfo = await getDbInfo()
        const allInfo = apiInfo.concat(dbInfo);
        return allInfo;
    }catch(error){
        console.log("Sucedio un error en: ",error)
    }
}

//------------------- RUTAS  --------------------------------------------------------------------------------------

router.get("/dogs",async(req,res)=>{
    try{
        const{name}=req.query
        let dogsTotal = await getAllDogs();
        if(name){
            let dogsName = await dogsTotal.filter((el)=>
                el.name.toLowerCase().includes(name.toLowerCase())
        );
        dogsName.length// el tamaño de mi arreglo siempre sera 1
        ?res.status(200).send(dogsName)
        :res.status(404).send(`🐕 No se encontro el Perro ${name}. 🐕`)
        }else{
            res.status(200).send(dogsTotal)
        }
    }catch(error){"sucedio un error en /dogs: ",error}
})
//------------------------------------------------------------------------------------------------------------------
router.get("/dogs/:id",async(req,res)=>{
  const id =req.params.id
  const dogsTotal = await getAllDogs()
  if(id){
    let dogId=await dogsTotal.filter((el)=> el.id==id)
    dogId.length
    ?res.status(200).json(dogId)
    :res.status(404).send("I did not find that dog")
  }
})
//---------------------------------------------------------------------------------------------------------------------------------------------
router.post("/dogs",async (req,res)=>{
  const {name,height_max,height_min,weight_max,weight_min,life_max,life_min,temperament,img,createInDb,} = req.body
  let createDog = await Dog.create({name,height_max,height_min,weight_max,weight_min,life_max,life_min,temperament,img,createInDb})
  let temperamentDb = await Temperament.findAll({
    where:{name:temperament}
  })
  await createDog.addTemperaments(temperamentDb)
  res.send("Se creo exitosamente")

})

//---------------------------------------------------------------------------------------------------------------------------------------------

router.get("/temperaments", async(req,res)=>{
  const temperamentsApi=await axios.get("https://api.thedogapi.com/v1/breeds")
  const temperaments = temperamentsApi.data.map((el)=>el.temperament) //[]
  let arr=[]; // --> [[],[],[]]
  for(let i =0; i<temperaments.length;i++){
    if(temperaments[i] !=undefined) arr.push(temperaments[i].split(", "));
  }
  const tempEach=arr.map((el)=>{
    for(let i=0;i<el.length;i++){
      return el[i];
    } // -->[string, string, string]
  })
  tempEach.forEach((el)=>{
    Temperament.findOrCreate({
      where:{name:el},
    })
  })
  const allTemperaments=await Temperament.findAll();
  res.status(200).send(allTemperaments)
})
//---------------------------------------------------------------------------------------------------------------------------------------------


module.exports = router;
