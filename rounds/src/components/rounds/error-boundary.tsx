import { Component, type ReactNode } from "react";
import { View } from "react-native";
import { Button, Copy } from "./ui";
export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <View style={{ padding: 32, gap: 18 }}>
        <Copy>
          Rounds could not display this screen. Your saved study data is still
          on this device.
        </Copy>
        <Button onPress={() => this.setState({ failed: false })}>
          Try again
        </Button>
      </View>
    ) : (
      this.props.children
    );
  }
}
