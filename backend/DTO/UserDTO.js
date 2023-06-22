class UserDTO {
    #login = '';
    #username = '';
    #avatar = '';
    #firstname = '';
    #lastname = '';
    #email = '';
    #password = '';
    #passwordConfirmation = '';
    #country = '';
    #createdAt = null;
    #updatedAt = null;

    constructor(login, username, avatar, firstname, lastname, email, password, passwordConfirmation, country, createdAt, updatedAt) {
        this.#login = login;
        this.#username = username;
        this.#avatar = avatar;
        this.#firstname = firstname;
        this.#lastname = lastname;
        this.#email = email;
        this.#password = password;
        this.#passwordConfirmation = passwordConfirmation;
        this.#country = country;
        this.#createdAt = createdAt;
        this.#updatedAt = updatedAt;
    }

    static withRequestData(requestData) {
        return new UserDTO(
            requestData['login'],
            requestData['username'],
            requestData['avatar'],
            requestData['firstname'],
            requestData['lastname'],
            requestData['email'],
            requestData['password'],
            requestData['password-confirmation'],
            requestData['country']
        )
    }

    static withUserObject(user) {
        return new UserDTO(
            undefined,
            user.username,
            user.avatar,
            user.firstname,
            user.lastname,
            user.email,
            undefined,
            undefined,
            user.country,
            user.createdAt,
            user.updatedAt
        );
    }

    toObject() {
        return {
            login: this.#login,
            username: this.#username,
            avatar: this.#avatar,
            firstname: this.#firstname,
            lastname: this.#lastname,
            email: this.#email,
            password: this.#password,
            passwordConfirmation: this.#passwordConfirmation,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt
        };
    }

    get login() {
        return this.#login;
    }

    set login(value) {
        this.#login = login;
    }

    get username() {
        return this.#username;
    }

    set username(value) {
        this.#username = value;
    }

    get avatar() {
        return this.#avatar;
    }

    set avatar(value) {
        this.#avatar = value;
    }

    get firstname() {
        return this.#firstname;
    }

    set firstname(value) {
        this.#firstname = value;
    }

    get lastname() {
        return this.#lastname;
    }

    set lastname(value) {
        this.#lastname = value;
    }

    get email() {
        return this.#email;
    }

    set email(value) {
        this.#email = value;
    }

    get password() {
        return this.#password;
    }

    set password(value) {
        this.#password = value;
    }

    get passwordConfirmation() {
        return this.#passwordConfirmation;
    }

    set passwordConfirmation(value) {
        this.#passwordConfirmation = value;
    }

    get country() {
        return this.#country;
    }

    set country(value) {
        this.#country = value;
    }

    get createdAt() {
        return this.#createdAt;
    }

    get updatedAt() {
        return this.#updatedAt;
    }
}

module.exports = UserDTO;