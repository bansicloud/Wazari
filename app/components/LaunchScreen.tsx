import React, { Component } from "react";
import { View, Text } from "react-native";
import * as Animatable from "react-native-animatable";

class LaunchScreen extends Component {
  render() {
    return (
      <Animatable.View
        animation="fadeOut"
        useNativeDriver={true}
        duration={5000}
        iterationCount={1}
        delay={0}
        style={{
          flex: 1,
          backgroundColor: "black",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <Animatable.Text
          animation="rubberBand"
          useNativeDriver={true}
          duration={500}
          iterationCount={"infinite"}
          delay={0}
          style={{
            color: "#78D7C2",
            fontSize: 32,
            fontFamily: "Menlo",
            fontWeight: "bold"
          }}
        >
          Wazari
        </Animatable.Text>
      </Animatable.View>
    );
  }
}

export default LaunchScreen;
