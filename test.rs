fn main(){
    enum Role{
        Admin,
        User,
        Guest
    };
    
    let r = Role::User;
    match r{
        Role::Admin => println!("Admin user"),
        Role::User => println!("Regular user"),
        Role::Guest => println!("Guest user"),
    };
}