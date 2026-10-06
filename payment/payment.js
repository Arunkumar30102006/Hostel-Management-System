let student = null;


/* LOAD STUDENT */

try {

    student =
        JSON.parse(
            localStorage.getItem("loggedInStudent")
        );

} catch (error) {

    student = null;

}


/* STUDENT INFORMATION */

if (student && student.studentId) {

    const rawName =
        (student.name || "Student").trim();

    document.getElementById(
        "studentName"
    ).textContent = rawName;


    document.getElementById(
        "studentId"
    ).textContent = student.studentId;


    document.getElementById(
        "bookingStudent"
    ).textContent = rawName;


    document.getElementById(
        "receiptStudent"
    ).textContent = rawName;


    document.getElementById(
        "profileAvatar"
    ).textContent =
        rawName.charAt(0).toUpperCase();

}


/* LOGOUT */

document
    .getElementById("logoutBtn")
    .addEventListener("click", function () {

        localStorage.removeItem(
            "loggedInStudent"
        );

        window.location.href =
            "../student-auth/index.html";

    });


/* NOTIFICATION */

document
    .getElementById("notification")
    .addEventListener("click", function () {

        alert(
            "You have no new notifications."
        );

    });


/* PAYMENT METHODS */

const paymentMethods =
    document.querySelectorAll(
        ".payment-method"
    );

const cardSection =
    document.getElementById(
        "cardSection"
    );

const upiSection =
    document.getElementById(
        "upiSection"
    );

let selectedMethod = "card";


paymentMethods.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            paymentMethods.forEach(
                function (item) {

                    item.classList.remove(
                        "active"
                    );

                }
            );


            this.classList.add("active");


            selectedMethod =
                this.dataset.method;


            if (selectedMethod === "card") {

                cardSection.classList.remove(
                    "hidden"
                );

                upiSection.classList.add(
                    "hidden"
                );

            } else {

                cardSection.classList.add(
                    "hidden"
                );

                upiSection.classList.remove(
                    "hidden"
                );

            }


            clearError();

        }
    );

});


/* CARD NUMBER */

const cardNumber =
    document.getElementById(
        "cardNumber"
    );


cardNumber.addEventListener(
    "input",
    function () {

        let value =
            this.value.replace(
                /\D/g,
                ""
            );


        value =
            value.substring(
                0,
                16
            );


        let groups =
            value.match(
                /.{1,4}/g
            );


        this.value =
            groups
                ? groups.join(" ")
                : "";

    }
);


/* EXPIRY */

const expiry =
    document.getElementById(
        "expiry"
    );


expiry.addEventListener(
    "input",
    function () {

        let value =
            this.value.replace(
                /\D/g,
                ""
            );


        value =
            value.substring(
                0,
                4
            );


        if (value.length > 2) {

            value =
                value.substring(0, 2) +
                "/" +
                value.substring(2);

        }


        this.value = value;

    }
);


/* CVV */

const cvv =
    document.getElementById(
        "cvv"
    );


cvv.addEventListener(
    "input",
    function () {

        this.value =
            this.value
                .replace(/\D/g, "")
                .substring(0, 3);

    }
);


/* PAYMENT FORM */

document
    .getElementById("paymentForm")
    .addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            clearError();


            /* CARD */

            if (selectedMethod === "card") {

                const name =
                    document
                        .getElementById(
                            "cardName"
                        )
                        .value
                        .trim();


                const number =
                    document
                        .getElementById(
                            "cardNumber"
                        )
                        .value
                        .replace(
                            /\s/g,
                            ""
                        );


                const expiryValue =
                    document
                        .getElementById(
                            "expiry"
                        )
                        .value
                        .trim();


                const cvvValue =
                    document
                        .getElementById(
                            "cvv"
                        )
                        .value
                        .trim();


                if (!name) {

                    showError(
                        "Please enter the card holder name."
                    );

                    return;

                }


                if (number.length !== 16) {

                    showError(
                        "Please enter a valid 16-digit card number."
                    );

                    return;

                }


                if (
                    !/^\d{2}\/\d{2}$/
                        .test(expiryValue)
                ) {

                    showError(
                        "Please enter a valid expiry date."
                    );

                    return;

                }


                if (
                    !/^\d{3}$/
                        .test(cvvValue)
                ) {

                    showError(
                        "Please enter a valid CVV."
                    );

                    return;

                }

            }


            /* UPI */

            if (selectedMethod === "upi") {

                const upi =
                    document
                        .getElementById(
                            "upiId"
                        )
                        .value
                        .trim();


                if (
                    !/^[\w.-]+@[\w.-]+$/
                        .test(upi)
                ) {

                    showError(
                        "Please enter a valid UPI ID."
                    );

                    return;

                }

            }


            /* SHOW PROCESSING */

            document
                .getElementById(
                    "paymentForm"
                )
                .classList.add(
                    "hidden"
                );


            document
                .getElementById(
                    "processing"
                )
                .classList.remove(
                    "hidden"
                );


            /* MOCK PAYMENT */

            setTimeout(
                function () {

                    const transactionId =
                        "TXN" +
                        Date.now()
                            .toString()
                            .slice(-8);


                    localStorage.setItem(
                        "paymentStatus",
                        "success"
                    );


                    localStorage.setItem(
                        "transactionId",
                        transactionId
                    );


                    document
                        .getElementById(
                            "transactionId"
                        )
                        .textContent =
                        transactionId;


                    document
                        .getElementById(
                            "receiptMethod"
                        )
                        .textContent =
                        selectedMethod === "card"
                            ? "Card"
                            : "UPI";


                    document
                        .getElementById(
                            "processing"
                        )
                        .classList.add(
                            "hidden"
                        );


                    document
                        .getElementById(
                            "success"
                        )
                        .classList.remove(
                            "hidden"
                        );

                },
                1800
            );

        }
    );


/* ERROR */

function showError(message) {

    const error =
        document.getElementById(
            "errorMessage"
        );


    error.textContent =
        message;


    error.classList.add(
        "show"
    );

}


function clearError() {

    const error =
        document.getElementById(
            "errorMessage"
        );


    error.textContent = "";


    error.classList.remove(
        "show"
    );

}