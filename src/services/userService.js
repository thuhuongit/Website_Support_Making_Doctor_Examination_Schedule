import { where } from "sequelize";
import db from "../models/index";
import bcrypt from 'bcryptjs';
import { raw } from "body-parser";

const salt = bcrypt.genSaltSync(10);




let handleUserLogin = (email, password) => {
    return new Promise(async (resolve, reject) => {
        try {
            let userData = {};
            let isExist = await checkUserEmail(email);
            if (isExist) {
                let user = await db.User.findOne({
                    where: {email: email},
                    attributes: [
                        'id',
                        'email', 
                        'roleId', 
                        'password', 
                        'firstName',
                        'lastName',
                        'image',
                      ],
                      include: [
                        {
                          model: db.Doctor_Infor,
                          attributes: ["priceId", "specialtyId"],
                          include: [
                            {
                              model: db.Allcode,
                              as: "priceTypeData",
                              attributes: ["valueEn", "valueVi"],
                            },
                          ],
                        },
                      ],


                    nest: true,   
                    raw: true
                });

                if (user) {
                    // So sánh mật khẩu nhập vào với mật khẩu trong database
                    let check = await bcrypt.compareSync(password, user.password);

                    if (check) {
                        userData.errCode = 0;
                        userData.errMessage = 'OK';
                        console.log(user);
                        delete user.password;
                        userData.user = user;
                    } else {
                        userData.errCode = 3;
                        userData.errMessage = 'Incorrect password';
                    }
                } else {
                    userData.errCode = 2;
                    userData.errMessage = 'User not found';
                }
            } else {
                userData.errCode = 1;
                userData.errMessage = 'Your email does not exist in our system';
            }

            resolve(userData);
        } catch (e) {
            reject(e);
        }
    });
};

let checkUserEmail = (email) => {
    return new Promise(async (resolve, reject) => {
        try {
            let user = await db.User.findOne({
                where: { email: email }
            });

            resolve(user ? true : false);
        } catch (e) {
            reject(e);
        }
    });
};



let getAllUsers = (userId) => {
    console.log('Received userId: ', userId); // Log giá trị userId nhận được
    return new Promise(async (resolve, reject) => {
        try {
            let users = '';
            if (!userId || userId === 'all') {
                // Truy vấn tất cả người dùng
                users = await db.User.findAll({
                    attributes: ['id', 'email', 'firstName', 'lastName', 'address', 'phone', 'gender', 'roleId']
                });
            } else {
                // Truy vấn người dùng cụ thể theo id
                users = await db.User.findOne({
                    where: { id: userId },
                    attributes: ['id', 'email', 'firstName', 'lastName', 'address', 'phone', 'gender', 'roleId']
                });
            }
            resolve(users);
        } catch (e) {
            reject(e);
        }
    });
};

let hashUserPassword = (password) => {
    return new Promise((resolve, reject) => {
        try {
            let hashPassword = bcrypt.hashSync(password, salt);
            resolve(hashPassword);
        } catch (e) {
            reject(e);
        }
    });
};


let createNewUser = (data) => {
    console.log("data", data);

    return new Promise(async (resolve, reject) => {
        try {
            // Check nếu email đã tồn tại trong hệ thống
            let check = await checkUserEmail(data.email);
            if (check === true) {
                resolve({
                    errCode: 1,
                    message: 'Your email is already in use'
                });
            } else {
                // Nếu chưa tồn tại, ánh xạ các giá trị text thành ID
                let roleId = mapRoleToId(data.role);  // Hàm map từ text sang roleId
                let positionId = mapPositionToId(data.position);  // Hàm map từ text sang positionId

                let hashPasswordFromBcrypt = await hashUserPassword(data?.password || "default_password");
                
                await db.User.create({
                    email: data.email,
                    password: hashPasswordFromBcrypt,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    address: data.address,
                    phone: data.phone,
                    gender: data.gender === 'Nữ' ? true : false,
                    roleId: roleId,               // ✅ dùng kết quả đã map
                    positionId: positionId
                });
                

                resolve({
                    errCode: 0,
                    message: 'OK'
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

let mapRoleToId = (role) => {
    // Chuyển đổi role thành roleId từ bảng Allcode hoặc bảng tương ứng
    switch (role) {
        case 'Bệnh nhân':
            return 1;  // Giả sử ID '1' là Bệnh nhân
        case 'Bác sĩ':
            return 2;  // Giả sử ID '2' là Bác sĩ
        default:
            return 0;  // Giá trị mặc định nếu không nhận diện được
    }
};

let mapPositionToId = (position) => {
    // Tương tự như role, ánh xạ vị trí vào ID
    switch (position) {
        case 'Bác sĩ':
            return 1;  // Giả sử ID '1' là Bác sĩ
        default:
            return 0;  // Mặc định nếu không tìm thấy
    }
};

let deleteUser = (userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let foundUser = await db.User.findOne({
                where: { id: userId }
            });

            if (!foundUser) {
                return resolve({
                    errCode: 2,
                    errMessage: 'The user does not exist'
                });
            };
            console.log('thuhuong check ', foundUser)
            await db.User.destroy({
                where: { id: userId }
            })

            return resolve({
                errCode: 0,
                message: 'The user has been deleted successfully'
            });
        } catch (e) {
            reject(e);
        }
    });
};

let updateUserData = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.id) {
                resolve({
                    errCode: 2,
                    errMessage: 'Missing required parameters'
                })
            }

            let user = await db.User.findOne({
                where:
                    { id: data.id },
                raw: false

            })
            if (user) {
                user.firstName = data.firstName;
                user.lastName = data.lastName;
                user.address = data.address;
                user.roleId = data.roleId || user.roleId;
                user.positionId = data.position;
                user.gender = data.gender;
                user.phone = data.phone || user.phone;
            if (data.avatar !== "") {
                user.image = data.avatar;
            }
                user.image = data.avatar;
                await user.save();

                resolve({
                    errCode: 0,
                    message: 'Update the user succeeds!'
                })

            } else {
                resolve({
                    errCode: 1,
                    errMessage: 'Users not found!'
                });
            }

        } catch (e) {
            reject(e);
        }
    });
};

let getAllCodeService = (typeInput) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!typeInput) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required'
                });
            } else {
                let res = {};
                let allcode = await db.Allcode.findAll({
                     where: {type: typeInput}
                });
                console.log("Dữ liệu lấy được:", allcode);
                res.errCode = 0;
                res.data = allcode; 
                resolve(res);
                
            }
        } catch (e) {
            reject(e);

            
        }
    });
};
let buildUrlEmailForgotPassword = (tokenUser, email) => {
    let result = `${process.env.URL_REACT}/retrieve-password?tokenUser=${tokenUser}&email=${email}`;
  
    return result;
  };
  
  let postForgotPasswordService = (data) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!data.email) {
          resolve({
            errCode: 1,
            errMessage: "Missing required parameter",
          });
        } else {
          let tokenUser = uuidv4(); // ⇨ '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' -random
          await emailService.sendForgotPasswordEmail({
            receiverEmail: data.email,
            redirectLink: buildUrlEmailForgotPassword(tokenUser, data.email),
          });
  
          //find user have in table Users-if have update tokenUser
          let user = await db.User.findOne({
            where: { email: data.email },
            raw: false,
          });
          if (user) {
            user.tokenUser = tokenUser;
            await user.save();
  
            resolve({
              errCode: 0,
              message: "Update the user and send Forgot Password email succeed!",
            });
          } else {
            resolve({
              errCode: 1,
              errMessage: `User's not found!`,
            });
          }
        }
      } catch (e) {
        reject(e);
      }
    });
  };
  
  let postVerifyRetrievePasswordService = async (data) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!data.tokenUser || !data.email || !data.newPassword) {
          resolve({
            errCode: 1,
            errMessage: "Missing required parameter",
          });
        } else {
          let hashPasswordFromBcrypt = await hashUserPassword(data.newPassword);
  
          //find user have in table Users-if have update tokenUser
          let user = await db.User.findOne({
            where: { email: data.email, tokenUser: data.tokenUser },
            raw: false,
          });
          if (user) {
            user.password = hashPasswordFromBcrypt;
            user.tokenUser = null;
            await user.save();
  
            resolve({
              errCode: 0,
              message: "Change user password succeed!",
            });
          } else {
            resolve({
              errCode: 2,
              errMessage: `User's not found!`,
            });
          }
        }
      } catch (e) {
        reject(e);
      }
    });
  };

module.exports = {
    handleUserLogin,
    getAllUsers,
    createNewUser,
    deleteUser,
    updateUserData,
    getAllCodeService,
    postForgotPasswordService,
    postVerifyRetrievePasswordService,
};
