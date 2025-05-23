const db = require("../models");

let createSpecialty = async (data) => {
  try {
    // Tạo mới chuyên khoa trong cơ sở dữ liệu
    let specialty = await db.Specialty.create({
      name: data.name,
      image: data.image,
      descriptionMarkdown: data.descriptionMarkdown,
      descriptionHTML: data.descriptionHTML,
    });
    return specialty;
  } catch (error) {
    throw error;
  }
};


let getAllSpecialty = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // Fetch data from the database
      let data = await db.Specialty.findAll();

      if (data && data.length > 0) {
           data.forEach((item) => { // Sử dụng forEach thay vì map vì bạn chỉ cần thay đổi mảng hiện tại
            if (item.image) { // Kiểm tra xem item.image có dữ liệu không
              image: Buffer.from(item.image, 'base64').toString('base64')
             } else {
              console.log("No image data found for item", item);
    }
  });
}

resolve({
  errCode: 0,
  errMessage: "Ok!",
  data,
});

    } catch (e) {
      reject(e); 
    }
  });
};


let getDetailSpecialtyById = (inputId, location) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!inputId || !location) {
        resolve({
          errCode: 1,
          errMessage: "Missing required parameter",
        });
      } else {
        let data = await db.Specialty.findOne({
          where: { id: inputId },
          attributes: ["descriptionHTML", "descriptionMarkdown"],
        });

        if (data) {
          //do something
          let doctorSpecialty = [];
          if (location === "ALL") {
            doctorSpecialty = await db.Doctor_Infor.findAll({
              where: { specialtyId: inputId },
              attributes: ["doctorId", "provinceId"],
            });
          } else {
            //find by location
            doctorSpecialty = await db.Doctor_Infor.findAll({
              where: { specialtyId: inputId, provinceId: location },
              attributes: ["doctorId", "provinceId"],
            });
          }

          data.doctorSpecialty = doctorSpecialty;
        } else {
          data = {};
        }
        resolve({
          errCode: 0,
          errMessage: "Ok!",
          data,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = {
  createSpecialty: createSpecialty,
  getAllSpecialty: getAllSpecialty,
  getDetailSpecialtyById: getDetailSpecialtyById,
};
