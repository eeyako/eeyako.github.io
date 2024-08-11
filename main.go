package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"unicode"
)

func cmdsHandler(w http.ResponseWriter, r *http.Request) {
	cmd := r.URL.Path[len("/cmds/"):]
	url := fmt.Sprintf("https://help.autodesk.com/cloudhelp/2022/ENU/Maya-Tech-Docs/CommandsPython/%s.html", cmd)
	http.Redirect(w, r, url, http.StatusFound)
}

func om2Handler(w http.ResponseWriter, r *http.Request) {
	cmd := r.URL.Path[len("/om2/"):]
	formatted := ""
	for _, r := range cmd {
		// If it's a lowercase, just add it as is
		if !unicode.IsUpper(r) {
			formatted += string(r)
			continue
		}
		// It's an uppercase and it's not the first, precede it with _ and lower it
		formatted += "_" + strings.ToLower(string(r))
	}

	url := fmt.Sprintf("https://help.autodesk.com/view/MAYAUL/2024/ENU/?guid=MAYA_API_REF_py_ref_class_open_maya_1_1%s_html", formatted)
	http.Redirect(w, r, url, http.StatusFound)
}

func main() {
	http.HandleFunc("/cmds/", cmdsHandler)
	http.HandleFunc("/om2/", om2Handler)
	log.Fatal(http.ListenAndServe(":8100", nil))
}
